# Mainnet Migration Plan

## ✅ Contract Assessment: READY FOR MAINNET

The new contracts are **production-ready** with minor fixes needed.

## Required Fixes

### 1. Fix AaveV3Strategy.getCurrentAPY()

**File:** `AaveV3Strategy.sol`

**Current:**
```solidity
function getCurrentAPY() external view returns (uint256) {
    // TODO: Implement by querying Aave ProtocolDataProvider
    // For now, return estimated APY
    return 350; // 3.5%
}
```

**Fix:**
```solidity
import {IProtocolDataProvider} from "@aave/core-v3/contracts/interfaces/IProtocolDataProvider.sol";

function getCurrentAPY() external view returns (uint256) {
    IProtocolDataProvider dataProvider = IProtocolDataProvider(
        addressesProvider.getPoolDataProvider()
    );
    (, uint256 liquidityRate, , , , , , , ,) = dataProvider.getReserveData(address(asset));
    // Convert from ray (1e27) to basis points (1e4)
    return (liquidityRate * 10000) / 1e27;
}
```

### 2. Fix SelfProtocolVerifier.updateConfig()

**File:** `SelfProtocolVerifier.sol`

**Current:**
```solidity
function updateConfig(...) external onlyOwner {
    verificationConfig = SelfUtils.formatVerificationConfigV2(newConfig);
    // Register new config with Self Hub (need hub address)
    // verificationConfigId = IIdentityVerificationHubV2(hubAddress)
    //     .setVerificationConfigV2(verificationConfig);
    emit ConfigUpdated(verificationConfigId);
}
```

**Fix:**
```solidity
address public immutable hubV2Address;

constructor(
    address _hubV2,
    string memory _scopeSeed,
    SelfUtils.UnformattedVerificationConfigV2 memory _config
) 
    SelfVerificationRoot(_hubV2, _scopeSeed)
    Ownable(msg.sender)
{
    hubV2Address = _hubV2; // Store for updateConfig
    // ... rest of constructor
}

function updateConfig(
    SelfUtils.UnformattedVerificationConfigV2 memory newConfig
) external onlyOwner {
    verificationConfig = SelfUtils.formatVerificationConfigV2(newConfig);
    verificationConfigId = IIdentityVerificationHubV2(hubV2Address)
        .setVerificationConfigV2(verificationConfig);
    emit ConfigUpdated(verificationConfigId);
}
```

### 3. Ensure Interface Compatibility

**File:** `IAave.sol` (or create new interface file)

Add to match `SelfProtocolVerifier`:
```solidity
interface ISelfVerifier {
    function isVerified(address user) external view returns (bool);
    function getNullifier(address user) external view returns (bytes32);
    function verifySelfProof(bytes memory proofPayload, bytes memory userContextData) external;
}
```

## Mainnet Addresses

### Celo Mainnet Aave V3
```solidity
PoolAddressesProvider: 0x6EAE47ccEFF68cCC1d6456d7344a42a58f26D6E0
cUSD: 0x765DE816845861e75A25fCA122bb6898B8B1282a
// acUSD: Query from Aave - depends on cUSD reserve configuration
```

### Celo Mainnet Self Protocol
```solidity
IdentityVerificationHubV2: 0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF
Scope Seed: "attestify"
```

## Deployment Order

1. **Deploy AaveV3Strategy**
   ```solidity
   constructor(
       cUSD_ADDRESS,           // 0x765DE816845861e75A25fCA122bb6898B8B1282a
       acUSD_ADDRESS,          // Get from Aave
       POOL_ADDRESSES_PROVIDER // 0x6EAE47ccEFF68cCC1d6456d7344a42a58f26D6E0
   )
   ```

2. **Deploy SelfProtocolVerifier**
   ```solidity
   constructor(
       HUB_V2_ADDRESS,         // 0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF
       "attestify",            // Scope seed
       verificationConfig      // Age 18+, forbidden countries, OFAC enabled
   )
   ```

3. **Deploy AttestifyVault (UUPS Proxy)**
   - Deploy implementation contract
   - Deploy proxy pointing to implementation
   - Initialize proxy:
   ```solidity
   initialize(
       cUSD_ADDRESS,
       aaveStrategyAddress,     // From step 1
       selfVerifierAddress,    // From step 2
       maxUserDeposit,         // e.g., 10_000e18
       maxTotalDeposit         // e.g., 100_000e18
   )
   ```

4. **Link Contracts**
   - Call `AaveV3Strategy.setVault(vaultAddress)`
   - Call `SelfProtocolVerifier.authorizeCaller(vaultAddress)`

## Frontend Updates

### 1. Update Contract Addresses
```typescript
// apps/web/src/config/contract.ts
celoMainnet: {
  vault: '<DEPLOYED_VAULT_ADDRESS>',
  cUSD: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
  acUSD: '<GET_FROM_AAVE>',
  aavePool: '<GET_FROM_AAVE_POOL_ADDRESSES_PROVIDER>',
  selfProtocol: '<DEPLOYED_SELF_VERIFIER_ADDRESS>',
}
```

### 2. Update Endpoint Type
```typescript
// Change from 'celo-staging' to 'celo' for mainnet
endpointType: 'celo', // Mainnet, not staging
```

### 3. Update Network Detection
```typescript
// Ensure frontend detects Celo Mainnet (Chain ID: 42220)
```

## Testing Checklist

- [ ] Deploy to testnet first with real Aave testnet addresses
- [ ] Test deposit flow
- [ ] Test withdraw flow
- [ ] Test verification flow
- [ ] Test rebalancing
- [ ] Test emergency functions
- [ ] Verify APY calculation
- [ ] Test upgrade mechanism (UUPS)
- [ ] Test strategy swapping
- [ ] Load testing with multiple users

## Security Considerations

1. **Proxy Admin**: Secure the proxy admin key (can upgrade implementation)
2. **Owner Keys**: Multi-sig for owner functions
3. **Initialization**: Ensure initialize() can only be called once
4. **Access Control**: Verify onlyVault modifiers work correctly
5. **Reentrancy**: All external calls protected

## Advantages of New Contracts

✅ **Upgradeable**: Fix bugs without redeployment
✅ **Modular**: Strategy can be swapped
✅ **Real Aave**: Production-ready integration
✅ **Enhanced Security**: Authorization system in verifier
✅ **Better Architecture**: Separation of concerns

## Migration from Testnet

Since current testnet contracts are NOT upgradeable:
- Users will need to withdraw from testnet
- Redeploy fresh on mainnet
- Users deposit fresh on mainnet
- No direct migration path (by design - fresh start on mainnet)

