// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ISelfProtocol
 * @notice Interface for Self Protocol verification contracts
 * @dev Used by vault contracts to check verification status
 */
interface ISelfProtocol {
    /**
     * @notice Check if a user is verified
     * @param user Address to check
     * @return True if user is verified
     */
    function isVerified(address user) external view returns (bool);

    /**
     * @notice Get verification timestamp
     * @param user Address to check
     * @return Timestamp when user was verified
     */
    function verificationTime(address user) external view returns (uint256);

    /**
     * @notice Verify a user's identity proof
     * @param proofPayload The zero-knowledge proof from Self Protocol
     * @param userContextData Additional context data
     */
    function verifyUser(
        bytes calldata proofPayload,
        bytes calldata userContextData
    ) external;
}
