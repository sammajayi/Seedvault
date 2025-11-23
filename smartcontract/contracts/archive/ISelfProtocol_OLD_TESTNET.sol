// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {SelfVerificationRoot} from "@selfxyz/contracts/contracts/abstract/SelfVerificationRoot.sol";
import {ISelfVerificationRoot} from "@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol";
import {SelfStructs} from "@selfxyz/contracts/contracts/libraries/SelfStructs.sol";
import {SelfUtils} from "@selfxyz/contracts/contracts/libraries/SelfUtils.sol";
import {IIdentityVerificationHubV2} from "@selfxyz/contracts/contracts/interfaces/IIdentityVerificationHubV2.sol";

/**
 * @title SelfProtocolVerification
 * @notice Self Protocol V2 integration contract for identity verification
 * @dev Implements SelfVerificationRoot to handle on-chain proof verification
 * 
 * This contract:
 * - Extends SelfVerificationRoot to connect with IdentityVerificationHubV2
 * - Registers verification configuration (age, forbidden countries, OFAC)
 * - Tracks verified users by address
 * - Provides interface for SeedVault to check verification status
 * 
 * Deployment:
 * 1. Deploy this contract with hubV2Address and scopeSeed
 * 2. Use the deployed address as the endpoint in SelfAppBuilder
 * 3. Pass this contract address to SeedVault constructor
 * 
 * @custom:security This contract uses Self Protocol's zero-knowledge proofs
 * for privacy-preserving identity verification
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

    /**
     * @notice Initialize Self Protocol verification contract
     * @param hubV2Address The IdentityVerificationHubV2 address for the network
     *        - Celo Testnet: 0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74
     *        - Celo Mainnet: 0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF
     * @param scopeSeed The scope identifier (must match frontend SelfAppBuilder scope)
     *        This creates a unique namespace for your application's verifications
     * 
     * @dev The constructor:
     * 1. Calls parent SelfVerificationRoot constructor
     * 2. Creates and formats verification configuration
     * 3. Registers config with IdentityVerificationHubV2
     * 4. Stores the returned configId for getConfigId()
     */
    constructor(
        address hubV2Address,
        string memory scopeSeed
    ) SelfVerificationRoot(hubV2Address, scopeSeed) {
        // Forbidden countries must match frontend disclosures
        // Frontend excludes: CUBA, IRAN, NORTH_KOREA, RUSSIA
        // Self Protocol requires ISO 3166-1 alpha-3 codes (3 characters)
        string[] memory forbiddenCountries = new string[](4);
        forbiddenCountries[0] = "CUB"; // Cuba
        forbiddenCountries[1] = "IRN"; // Iran
        forbiddenCountries[2] = "PRK"; // North Korea (Democratic People's Republic of Korea)
        forbiddenCountries[3] = "RUS"; // Russia

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

    /**
     * @notice Returns the verification configuration ID
     * @dev Required override from SelfVerificationRoot
     * @return The verification config ID registered with the hub
     */
    function getConfigId(
        bytes32 /* destinationChainId */,
        bytes32 /* userIdentifier */,
        bytes memory /* userDefinedData */
    ) public view override returns (bytes32) {
        return verificationConfigId;
    }

    /**
     * @notice Custom verification hook called after successful proof verification
     * @dev This function is called by SelfVerificationRoot after verifySelfProof succeeds
     * @param output The disclosed identity attributes from Self Protocol
     * @param userData The userDefinedData passed during verification (can be empty)
     * 
     * The GenericDiscloseOutputV2 structure contains:
     * - nullifier: Privacy-preserving identifier for the verification
     * - issuingState: Country code that issued the document
     * - fullName: Full name from the identity document
     * - documentNumber: Document number (hashed for privacy)
     * - nationality: Nationality country code
     * - dateOfBirth: Date of birth
     * - gender: Gender information
     * - expiryDate: Document expiry date
     */
    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory userData
    ) internal override {
        // Store verification by the actual caller (msg.sender)
        // This allows SeedVault to check verification by user address
        address user = msg.sender;
        
        // Extract nullifier for privacy-preserving identifier
        bytes32 nullifier = bytes32(output.nullifier);
        
        // Optional: Parse userDefinedData if needed for custom logic
        // Currently not used, but available for future enhancements
        // string memory userDefinedDataStr = string(userData);

        // Store verification data by user address (for SeedVault integration)
        isVerified[user] = true;
        verificationTime[user] = block.timestamp;
        userNullifier[user] = nullifier;

        emit UserVerified(user, nullifier, block.timestamp);
    }

    /* ========== PUBLIC VERIFICATION FUNCTION ========== */

    /**
     * @notice Verify a user's identity proof from Self Protocol
     * @dev This function is called by SeedVault or directly by users
     * @param proofPayload The zero-knowledge proof from Self Protocol
     * @param userContextData Additional context data (can be empty)
     * 
     * @dev Flow:
     * 1. Calls verifySelfProof() from SelfVerificationRoot (inherited public function)
     * 2. SelfVerificationRoot validates proof with IdentityVerificationHubV2
     * 3. On success, customVerificationHook() is called automatically
     * 4. User is marked as verified in isVerified mapping
     * 
     * @dev Note: verifySelfProof is already public in SelfVerificationRoot,
     * so Self Protocol SDK can call it directly on this contract.
     * 
     * @custom:security Uses Self Protocol's zero-knowledge proofs
     * No personal data is stored on-chain, only verification status
     */
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
