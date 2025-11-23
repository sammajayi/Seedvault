// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../ISelfProtocol.sol";

/**
 * @title MockSelfProtocol
 * @notice Mock implementation of ISelfProtocol for testing
 */
contract MockSelfProtocol is ISelfProtocol {
    mapping(address => bool) public isVerified;
    mapping(address => uint256) public verificationTime;

    /**
     * @notice Manually set verification status for testing
     */
    function setVerified(address user, bool verified) external {
        isVerified[user] = verified;
        if (verified && verificationTime[user] == 0) {
            verificationTime[user] = block.timestamp;
        }
    }

    /**
     * @notice Mock verification function - always succeeds for testing
     */
    function verifyUser(
        bytes calldata /* proofPayload */,
        bytes calldata /* userContextData */
    ) external override {
        // Mark caller as verified
        isVerified[msg.sender] = true;
        verificationTime[msg.sender] = block.timestamp;
    }
}

