import hre from "hardhat";
import { configVariable } from "hardhat/config";
import { ethers } from "ethers";

// Try to load .env file if dotenv is available
try {
  const dotenv = await import("dotenv");
  dotenv.config();
} catch (e) {
  // dotenv not available, that's okay
}

async function main() {
  console.log("🚀 Deploying SeedVault to Celo Sepolia...\n");

  // Get the private key - try multiple sources
  let privateKey: string | undefined;
  
  // Try 1: From environment variable (highest priority for .env files)
  privateKey = process.env.CELO_SEPOLIA_PRIVATE_KEY;
  
  // Try 2: From config variable (Hardhat keystore)
  if (!privateKey) {
    try {
      const configKey = configVariable("CELO_SEPOLIA_PRIVATE_KEY");
      if (typeof configKey === "string") {
        privateKey = configKey;
      }
    } catch (e) {
      // Config variable not set, continue
    }
  }
  
  if (!privateKey) {
    throw new Error(
      "No private key found. Please set CELO_SEPOLIA_PRIVATE_KEY using one of:\n" +
      "  1. npx hardhat keystore set CELO_SEPOLIA_PRIVATE_KEY\n" +
      "  2. export CELO_SEPOLIA_PRIVATE_KEY=your_key\n" +
      "  3. Add CELO_SEPOLIA_PRIVATE_KEY=your_key to a .env file"
    );
  }
  
  // Convert to string and ensure it starts with 0x
  const privateKeyStr = String(privateKey).trim();
  const finalPrivateKey = privateKeyStr.startsWith("0x") ? privateKeyStr : "0x" + privateKeyStr;
  
  // Get RPC URL - prioritize environment variable
  let rpcUrlStr: string | undefined = process.env.CELO_SEPOLIA_RPC_URL;
  
  // Try to get from config variable if not in env
  if (!rpcUrlStr) {
    try {
      const configUrl = configVariable("CELO_SEPOLIA_RPC_URL");
      if (typeof configUrl === "string") {
        rpcUrlStr = configUrl;
      } else if (configUrl && typeof configUrl === "object") {
        // If it's a URL object, try to get href or toString
        if ("href" in configUrl) {
          rpcUrlStr = (configUrl as any).href;
        } else if ("toString" in configUrl) {
          rpcUrlStr = (configUrl as any).toString();
        }
      }
    } catch (e) {
      // Continue to use default
    }
  }
  
  // Final check - ensure it's a valid string
  if (!rpcUrlStr) {
    // Try common Celo Sepolia RPC endpoints
    rpcUrlStr = "https://rpc.ankr.com/celo_sepolia";
  }
  
  rpcUrlStr = String(rpcUrlStr).trim();
  if (rpcUrlStr === "[object Object]" || rpcUrlStr.startsWith("[object") || !rpcUrlStr.startsWith("http")) {
    rpcUrlStr = "https://rpc.ankr.com/celo_sepolia";
  }
  
  console.log("Using RPC URL:", rpcUrlStr);
  
  // Create provider - let it detect the actual chain ID from the network
  const provider = new ethers.JsonRpcProvider(rpcUrlStr);
  const deployer = new ethers.Wallet(finalPrivateKey, provider);
  
  // Get the actual network chain ID
  const network = await provider.getNetwork();
  console.log("Network detected - Chain ID:", network.chainId.toString());
  
  console.log("Deploying with account:", deployer.address);
  
  // Get balance
  const balance = await provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "CELO\n");

  // Contract addresses on Celo Sepolia
  // IdentityVerificationHub address from Self Protocol docs:
  // https://docs.self.xyz/contract-integration/deployed-contracts
  const IDENTITY_VERIFICATION_HUB = "0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74";
  const CUSD_ADDRESS = "0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b";
  const ACUSD_ADDRESS = "0xBba98352628B0B0c4b40583F593fFCb630935a45";
  const AAVE_POOL = "0x3E59A31363E2ad014dcbc521c4a0d5757d9f3402";

  // Scope seed must match frontend scope (from NEXT_PUBLIC_SELF_SCOPE env var)
  const SCOPE_SEED = process.env.SELF_SCOPE_SEED || "attestify";

  console.log("📝 Using Celo Sepolia Contracts:");
  console.log("  IdentityVerificationHub:", IDENTITY_VERIFICATION_HUB);
  console.log("  Scope Seed:", SCOPE_SEED);
  console.log("  cUSD:", CUSD_ADDRESS);
  console.log("  acUSD (Aave):", ACUSD_ADDRESS);
  console.log("  Aave Pool:", AAVE_POOL);

  // Step 1: Deploy SelfProtocolVerification contract
  console.log("\n📝 Step 1: Deploying SelfProtocolVerification...");
  
  const SelfProtocolArtifact = await hre.artifacts.readArtifact("SelfProtocolVerification");
  const SelfProtocolFactory = new ethers.ContractFactory(
    SelfProtocolArtifact.abi,
    SelfProtocolArtifact.bytecode,
    deployer
  );
  
  const selfProtocol = await SelfProtocolFactory.deploy(
    IDENTITY_VERIFICATION_HUB,
    SCOPE_SEED
  );
  
  await selfProtocol.waitForDeployment();
  const selfProtocolAddress = await selfProtocol.getAddress();
  console.log("✅ SelfProtocolVerification deployed to:", selfProtocolAddress);

  // Step 2: Deploy SeedVault
  console.log("\n📝 Step 2: Deploying SeedVault...");
  
  // Read contract artifact
  const contractArtifact = await hre.artifacts.readArtifact("SeedVault");
  
  // Create contract factory
  const SeedVaultFactory = new ethers.ContractFactory(
    contractArtifact.abi,
    contractArtifact.bytecode,
    deployer
  );
  
  // Deploy the contract with the deployed SelfProtocolVerification address
  const vault = await SeedVaultFactory.deploy(
    CUSD_ADDRESS,
    ACUSD_ADDRESS,
    AAVE_POOL,
    selfProtocolAddress  // Use deployed SelfProtocolVerification address, not hub address
  );

  await vault.waitForDeployment();
  const vaultAddress = await vault.target;
  
  const deployTx = vault.deploymentTransaction();
  console.log("Deployment transaction hash:", deployTx?.hash);
  console.log("\n✅ SeedVault deployed to:", vaultAddress);

  // Get network info for summary
  const networkInfo = await provider.getNetwork();
  
  // Deployment Summary
  const deploymentSummary = {
    network: "Celo Sepolia",
    chainId: Number(networkInfo.chainId),
    vault: vaultAddress,
    selfProtocolVerification: selfProtocolAddress,
    identityVerificationHub: IDENTITY_VERIFICATION_HUB,
    scopeSeed: SCOPE_SEED,
    cUSD: CUSD_ADDRESS,
    acUSD: ACUSD_ADDRESS,
    aavePool: AAVE_POOL,
    deployer: deployer.address,
  };

  console.log("\n============================================================");
  console.log("💾 Deployment summary:");
  console.log(JSON.stringify(deploymentSummary, null, 2));
  console.log("============================================================\n");

  console.log("🎉 Deployment complete! Update your frontend with the new contract addresses.");
  console.log("\n📋 Next steps:");
  console.log("  1. Verify both contracts on CeloScan");
  console.log("  2. Update your frontend with:");
  console.log("     - Vault address:", vaultAddress);
  console.log("     - SelfProtocolVerification address:", selfProtocolAddress);
  console.log("  3. Ensure NEXT_PUBLIC_SELF_SCOPE matches scopeSeed:", SCOPE_SEED);
  console.log("  4. Test the deployment with a small deposit");
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});
