# Archived Contracts - Testnet Versions

This directory contains the old testnet contracts that have been replaced by the new mainnet-ready contracts.

## Archived Files

### SeedVault_OLD_TESTNET.sol
- **Status**: Replaced by `SeedVault.sol` (new version)
- **Reason**: Non-upgradeable, direct Aave integration
- **New Version**: `SeedVault.sol` (UUPS upgradeable, strategy pattern)

### ISelfProtocol_OLD_TESTNET.sol
- **Status**: Replaced by `SelfProtocolVerifier.sol`
- **Reason**: Simple verifier, minimal features
- **New Version**: `SelfProtocolVerifier.sol` (enhanced with authorization, manual verification, etc.)

## Current Contracts (Mainnet-Ready)

- `SeedVault.sol` - Upgradeable vault with strategy pattern
- `AaveV3Strategy.sol` - Real Aave V3 integration
- `SelfProtocolVerifier.sol` - Enhanced Self Protocol verifier
- `ISelfProtocol.sol` - Interface for verification contracts

## Migration Notes

The old contracts were deployed on Celo Sepolia testnet:
- SeedVault: `0x126bAE433a06C1DA78A02715fAe35FF11f42C2Ad`
- SelfProtocolVerification: `0x2fB9C37215410f97e0FE2906c0E940aA483DeCf6`

New contracts will be deployed fresh on Celo Mainnet.

