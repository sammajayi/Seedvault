# Troubleshooting Self Protocol "proof_generation_failed" Error

## Error Details
- **Error Code**: `error`
- **Status**: `proof_generation_failed`
- **Reason**: `error`

## Possible Causes

### 1. Contract Not Verified on CeloScan
Self Protocol may need the contract ABI to be publicly available. Verify the contract on CeloScan.

**Solution:**
1. Go to https://sepolia.celoscan.io/address/0x2fB9C37215410f97e0FE2906c0E940aA483DeCf6
2. Click "Contract" tab → "Verify and Publish"
3. Enter:
   - Compiler: `0.8.28`
   - License: `MIT`
   - Optimization: `No` (or match deployment settings)
   - Upload source code

### 2. Contract Configuration Mismatch
The contract's verification config might not match what Self Protocol expects.

**Check:**
- Scope seed in contract: `attestify`
- Scope in frontend: `attestify` (must match exactly)
- Forbidden countries: CUB, IRN, PRK, RUS (3-character codes)
- Minimum age: 18

### 3. Network/Chain ID Mismatch
Ensure you're on the correct network.

**Check:**
- Network: Celo Sepolia
- Chain ID: 11142220 (or 44787 depending on RPC)
- Endpoint type: `celo-staging`

### 4. Contract Deployment Issue
The contract might not be properly deployed or initialized.

**Verify:**
```bash
# Check contract on CeloScan
https://sepolia.celoscan.io/address/0x2fB9C37215410f97e0FE2906c0E940aA483DeCf6

# Check if contract has code
# Check constructor parameters
# Check if verificationConfigId was set
```

### 5. Self Protocol Service Issue
The Self Protocol service might be temporarily unavailable.

**Solution:**
- Wait a few minutes and try again
- Check Self Protocol status
- Try using mock passports for testing

## Debugging Steps

### Step 1: Verify Contract Deployment
```bash
# Check contract on CeloScan
curl "https://sepolia.celoscan.io/api?module=proxy&action=eth_getCode&address=0x2fB9C37215410f97e0FE2906c0E940aA483DeCf6&tag=latest"
```

### Step 2: Check Contract Configuration
Verify the contract was initialized correctly:
- Hub address: `0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74`
- Scope seed: `attestify`
- Config ID was set

### Step 3: Verify Frontend Configuration
Check browser console for:
- Endpoint address: `0x2fB9C37215410f97e0FE2906c0E940aA483DeCf6`
- Scope: `attestify`
- Endpoint type: `celo-staging`
- Network: Celo Sepolia

### Step 4: Test Contract Functions
Try calling contract functions directly:
- `getConfigId()` - should return a bytes32
- `isVerified(address)` - should return bool
- `verificationConfig()` - should return config struct

## Quick Fixes

1. **Verify Contract on CeloScan** (Most likely fix)
2. **Double-check scope matches** (contract and frontend)
3. **Ensure network is Celo Sepolia**
4. **Check contract has code deployed**
5. **Try with mock passport** (for testing)

## Contact

If issue persists:
- Check Self Protocol Discord/Support
- Review contract deployment logs
- Verify all configuration matches

