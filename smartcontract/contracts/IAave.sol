// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IAave
 * @notice Interface for Aave V3 Protocol on Celo
 */

/**
 * @notice Main Aave V3 Pool interface
 */
interface IPool {
    /**
     * @notice Supply assets to earn interest (replaces deposit in V2)
     */
    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external;
    
    /**
     * @notice Withdraw assets (same as V2)
     */
    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256);
    
    /**
     * @notice Get user account data
     */
    function getUserAccountData(address user)
        external
        view
        returns (
            uint256 totalCollateralBase,
            uint256 totalDebtBase,
            uint256 availableBorrowsBase,
            uint256 currentLiquidationThreshold,
            uint256 ltv,
            uint256 healthFactor
        );
}

/**
 * @notice Aave aToken interface (replaces mToken)
 */
interface IAToken {
    function balanceOf(address account) external view returns (uint256);
    function scaledBalanceOf(address user) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function UNDERLYING_ASSET_ADDRESS() external view returns (address);
}