// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {SelfVerificationRoot} from "@selfxyz/contracts/contracts/abstract/SelfVerificationRoot.sol";
import {ISelfVerificationRoot} from "@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol";
import {SelfStructs} from "@selfxyz/contracts/contracts/libraries/SelfStructs.sol";
import {SelfUtils} from "@selfxyz/contracts/contracts/libraries/SelfUtils.sol";
import {IIdentityVerificationHubV2} from "@selfxyz/contracts/contracts/interfaces/IIdentityVerificationHubV2.sol";

/**
 * @title SelfProtocolVerification
 * @notice Handles Self Protocol identity verification for SeedVault
 * @dev This contract must be deployed separately and referenced by your vault
 */
contract SelfProtocolVerification is SelfVerificationRoot {
    /* ========== STATE VARIABLES ========== */

    SelfStructs.VerificationConfigV2 public verificationConfig;
    bytes32 public verificationConfigId;

    // Track verified users
    mapping(address => bool) public isVerified;
    mapping(address => uint256) public verificationTime;
    mapping(address => bytes32) public userNullifier;

    /* ========== EVENTS ========== */

    event UserVerified(
        address indexed user,
        bytes32 nullifier,
        uint256 timestamp
    );

    /* ========== CONSTRUCTOR ========== */

    constructor(
        address hubV2Address,
        string memory scopeSeed
    ) SelfVerificationRoot(hubV2Address, scopeSeed) {
        // Properly declare forbiddenCountries
        string[] memory forbiddenCountries = new string[](0); // Allow all countries

        SelfUtils.UnformattedVerificationConfigV2 memory rawConfig = SelfUtils
            .UnformattedVerificationConfigV2({
                olderThan: 18,
                forbiddenCountries: forbiddenCountries,
                ofacEnabled: true
            });

        // Format and register the config
        verificationConfig = SelfUtils.formatVerificationConfigV2(rawConfig);
        verificationConfigId = IIdentityVerificationHubV2(hubV2Address)
            .setVerificationConfigV2(verificationConfig);
    }

    /* ========== REQUIRED OVERRIDES ========== */

    function getConfigId(
        bytes32 /* destinationChainId */,
        bytes32 /* userIdentifier */,
        bytes memory /* userDefinedData */
    ) public view override returns (bytes32) {
        return verificationConfigId;
    }

    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory /* userData */
    ) internal override {
        // Store verification by the actual caller (msg.sender)
        // This allows SeedVault to check verification by user address
        address user = msg.sender;
        
        // Also store the nullifier for reference (privacy-preserving identifier)
        bytes32 nullifier = bytes32(output.nullifier);

        // Store verification data by user address (for SeedVault integration)
        isVerified[user] = true;
        verificationTime[user] = block.timestamp;
        userNullifier[user] = nullifier;

        emit UserVerified(user, nullifier, block.timestamp);
    }

    /**
     * @notice Verify a user's identity proof
     * @param proof The proof bytes to verify
     * @return bool True if verification is successful
     */
    function verify(bytes calldata proof) external view returns (bool) {
        // For now, return true for testing
        // In production, this would verify the proof against Self Protocol
        return true;
    }

    /* ========== PUBLIC VERIFICATION FUNCTION ========== */

    function verifyUser(
        bytes calldata proofPayload,
        bytes calldata userContextData
    ) external {
        verifySelfProof(proofPayload, userContextData);
    }
}

/* ========== UPDATED VAULT INTERFACE ========== */

/**
 * @title ISelfProtocol
 * @notice Simplified interface for SeedVault to check verification status
 */
interface ISelfProtocol {
    function isVerified(address user) external view returns (bool);

    function verificationTime(address user) external view returns (uint256);

    function verifyUser(
        bytes calldata proofPayload,
        bytes calldata userContextData
    ) external;
}
