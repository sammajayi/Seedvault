# Deploying SeedVault to Celo Sepolia Testnet

This guide will help you deploy the SeedVault contract to Celo Sepolia testnet.

## Prerequisites

1. **Get CELO testnet tokens**: You'll need CELO tokens to pay for gas fees
   - Use the [Celo Faucet](https://faucet.celo.org/) to get testnet CELO
   - Or use [QuickNode Faucet](https://faucet.quicknode.com/celo/sepolia)

2. **Set up your private key**: You'll need a wallet with CELO tokens

## Step 1: Set Environment Variables

You need to set the following environment variables. You can either:

### Option A: Use Hardhat Keystore (Recommended)
```bash
npx hardhat keystore set CELO_SEPOLIA_PRIVATE_KEY
npx hardhat keystore set CELO_SEPOLIA_RPC_URL
```

### Option B: Use Environment Variables
Create a `.env` file (make sure it's in `.gitignore`):
```bash
CELO_SEPOLIA_PRIVATE_KEY=your_private_key_here
CELO_SEPOLIA_RPC_URL=https://sepolia-forno.celo-testnet.org
```

Or export them:
```bash
export CELO_SEPOLIA_PRIVATE_KEY=your_private_key_here
export CELO_SEPOLIA_RPC_URL=https://sepolia-forno.celo-testnet.org
```

## Step 2: Verify Contract Addresses

The deployment script uses these Celo Sepolia addresses:
- **Self Protocol**: `0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74`
- **cUSD**: `0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b`
- **acUSD (Aave)**: `0xBba98352628B0B0c4b40583F593fFCb630935a45`
- **Aave Pool**: `0x3E59A31363E2ad014dcbc521c4a0d5757d9f3402`

Verify these are correct before deploying. You can check them on [CeloScan Sepolia](https://sepolia.celoscan.io/).

## Step 3: Deploy the Contract

Run the deployment script:

```bash
npx hardhat run scripts/deploy.ts --network celoSepolia
```

## Step 4: Verify the Deployment

After deployment, you'll see:
- The contract address
- Deployment transaction hash
- A summary of all addresses

You can verify the contract on CeloScan:
1. Go to [CeloScan Sepolia](https://sepolia.celoscan.io/)
2. Search for your contract address
3. Click "Contract" tab
4. Click "Verify and Publish"
5. Enter your contract details

## Step 5: Test the Deployment

After deployment, you can:
1. Check the contract on CeloScan
2. Interact with it using a tool like [Remix](https://remix.ethereum.org/)
3. Test deposits and withdrawals

## Troubleshooting

### "Insufficient funds" error
- Make sure your wallet has CELO tokens (not just cUSD)
- Get testnet CELO from a faucet

### "Network not found" error
- Make sure you've set the `CELO_SEPOLIA_RPC_URL` config variable
- Check that the network name in the command matches `celoSepolia`

### "Invalid private key" error
- Make sure your private key starts with `0x`
- Verify you're using the correct private key

## Network Details

- **Network Name**: Celo Sepolia Testnet
- **Chain ID**: 44787
- **RPC URL**: https://sepolia-forno.celo-testnet.org
- **Explorer**: https://sepolia.celoscan.io/
- **Currency**: CELO (native), cUSD (stablecoin)

## Next Steps

After successful deployment:
1. Save the contract address
2. Update your frontend configuration
3. Test the contract with small amounts first
4. Monitor the contract on CeloScan




