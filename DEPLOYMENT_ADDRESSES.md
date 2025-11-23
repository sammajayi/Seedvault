# Deployment Addresses - Celo Sepolia

**Deployment Date:** November 23, 2025  
**Network:** Celo Sepolia Testnet  
**Chain ID:** 11142220  
**Deployer:** 0x95e1CF9174AbD55E47b9EDa1b3f0F2ba0f4369a0

## Contract Addresses

### SelfProtocolVerification
**Address:** `0x2fB9C37215410f97e0FE2906c0E940aA483DeCf6`  
**Purpose:** Handles Self Protocol identity verification  
**This is the endpoint address for Self Protocol SDK**

### SeedVault
**Address:** `0x126bAE433a06C1DA78A02715fAe35FF11f42C2Ad`  
**Purpose:** Main vault contract for deposits and withdrawals

## Configuration

- **Scope Seed:** `attestify`
- **IdentityVerificationHub:** `0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74`
- **Forbidden Countries:** CUB, IRN, PRK, RUS
- **Minimum Age:** 18
- **OFAC Enabled:** Yes

## Frontend Environment Variables

Add these to `apps/web/.env.local`:

```bash
# Self Protocol Configuration
NEXT_PUBLIC_SELF_PROTOCOL_ADDRESS=0x2fB9C37215410f97e0FE2906c0E940aA483DeCf6
NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS=0x126bAE433a06C1DA78A02715fAe35FF11f42C2Ad
NEXT_PUBLIC_SELF_SCOPE=attestify

# Other existing variables...
NEXT_PUBLIC_CUSD_CONTRACT_ADDRESS=0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b
NEXT_PUBLIC_ACUSD_CONTRACT_ADDRESS=0xBba98352628B0B0c4b40583F593fFCb630935a45
NEXT_PUBLIC_AAVE_POOL_ADDRESS=0x3E59A31363E2ad014dcbc521c4a0d5757d9f3402
```

## Verification Links

- **SelfProtocolVerification:** https://sepolia.celoscan.io/address/0x2fB9C37215410f97e0FE2906c0E940aA483DeCf6
- **SeedVault:** https://sepolia.celoscan.io/address/0x126bAE433a06C1DA78A02715fAe35FF11f42C2Ad

## Next Steps

1. ✅ Contracts deployed
2. ⏳ Verify contracts on CeloScan
3. ⏳ Update frontend environment variables
4. ⏳ Test verification flow
5. ⏳ Test deposit flow

