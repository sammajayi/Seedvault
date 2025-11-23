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
  console.log("🚀 Deploying SeedVault to Celo Mainnet...\n");

  // Get the private key - try multiple sources
  let privateKey: string | undefined;
  
  // Try 1: From environment variable (highest priority for .env files)
  privateKey = process.env.CELO_MAINNET_PRIVATE_KEY;
  
  // Try 2: From config variable (Hardhat keystore)
  if (!privateKey) {
    try {
      const configKey = configVariable("CELO_MAINNET_PRIVATE_KEY");
      if (typeof configKey === "string") {
        privateKey = configKey;
      }
    } catch (e) {
      // Config variable not set, continue
    }
  }
  
  if (!privateKey) {
    throw new Error(
      "No private key found. Please set CELO_MAINNET_PRIVATE_KEY using one of:\n" +
      "  1. npx hardhat keystore set CELO_MAINNET_PRIVATE_KEY\n" +
      "  2. export CELO_MAINNET_PRIVATE_KEY=your_key\n" +
      "  3. Add CELO_MAINNET_PRIVATE_KEY=your_key to a .env file"
    );
  }
  
  // Convert to string and ensure it starts with 0x
  const privateKeyStr = String(privateKey).trim();
  const finalPrivateKey = privateKeyStr.startsWith("0x") ? privateKeyStr : "0x" + privateKeyStr;
  
  // Get RPC URL - prioritize environment variable
  let rpcUrlStr: string | undefined = process.env.CELO_MAINNET_RPC_URL;
  
  // Try to get from config variable if not in env
  if (!rpcUrlStr) {
    try {
      const configUrl = configVariable("CELO_MAINNET_RPC_URL");
      if (typeof configUrl === "string") {
        rpcUrlStr = configUrl;
      } else if (configUrl && typeof configUrl === "object") {
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
    // Default Celo Mainnet RPC
    rpcUrlStr = "https://forno.celo.org";
  }
  
  rpcUrlStr = String(rpcUrlStr).trim();
  if (rpcUrlStr === "[object Object]" || rpcUrlStr.startsWith("[object") || !rpcUrlStr.startsWith("http")) {
    rpcUrlStr = "https://forno.celo.org";
  }
  
  console.log("Using RPC URL:", rpcUrlStr);
  
  // Create provider
  const provider = new ethers.JsonRpcProvider(rpcUrlStr);
  const deployer = new ethers.Wallet(finalPrivateKey, provider);
  
  // Get the actual network chain ID
  const network = await provider.getNetwork();
  console.log("Network detected - Chain ID:", network.chainId.toString());
  
  if (Number(network.chainId) !== 42220) {
    console.warn("⚠️  WARNING: Chain ID is not 42220 (Celo Mainnet). Proceeding anyway...");
  }
  
  console.log("Deploying with account:", deployer.address);
  
  // Get balance
  const balance = await provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "CELO\n");

  // ========== MAINNET ADDRESSES ==========
  
  // Self Protocol Mainnet
  const IDENTITY_VERIFICATION_HUB = "0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF";
  
  // Celo Mainnet Aave V3
  const POOL_ADDRESSES_PROVIDER = "0x6EAE47ccEFF68cCC1d6456d7344a42a58f26D6E0";
  const CUSD_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a";
  
  // Note: acUSD address needs to be queried from Aave or set manually
  // You can get it by calling PoolAddressesProvider.getReserveData(cUSD).aTokenAddress
  const ACUSD_ADDRESS = process.env.CELO_MAINNET_ACUSD_ADDRESS || "";
  
  if (!ACUSD_ADDRESS) {
    console.log("⚠️  ACUSD address not set. Will query from Aave PoolAddressesProvider...");
  }

  // Scope seed must match frontend scope
  const SCOPE_SEED = process.env.SELF_SCOPE_SEED || "attestify";

  // Vault limits
  const MAX_USER_DEPOSIT = ethers.parseEther("10000"); // 10,000 cUSD per user
  const MAX_TOTAL_DEPOSIT = ethers.parseEther("1000000"); // 1,000,000 cUSD total

  console.log("📝 Using Celo Mainnet Contracts:");
  console.log("  IdentityVerificationHub:", IDENTITY_VERIFICATION_HUB);
  console.log("  PoolAddressesProvider:", POOL_ADDRESSES_PROVIDER);
  console.log("  cUSD:", CUSD_ADDRESS);
  console.log("  acUSD:", ACUSD_ADDRESS || "(will query from Aave)");
  console.log("  Scope Seed:", SCOPE_SEED);
  console.log("  Max User Deposit:", ethers.formatEther(MAX_USER_DEPOSIT), "cUSD");
  console.log("  Max Total Deposit:", ethers.formatEther(MAX_TOTAL_DEPOSIT), "cUSD\n");

  // ========== STEP 1: Get acUSD address from Aave ==========
  
  let acUSDAddress = ACUSD_ADDRESS;
  
  if (!acUSDAddress) {
    console.log("📝 Step 1: Querying acUSD address from Aave...");
    try {
      const addressesProviderContract = new ethers.Contract(
        POOL_ADDRESSES_PROVIDER,
        [
          "function getPool() external view returns (address)",
          "function getPoolDataProvider() external view returns (address)"
        ],
        provider
      );
      
      const poolAddress = await addressesProviderContract.getPool();
      const poolContract = new ethers.Contract(
        poolAddress,
        [
          "function getReserveData(address asset) external view returns (tuple(uint256,uint128,uint128,uint128,uint128,uint40,uint16,address,address,address,address,address,address,uint8))"
        ],
        provider
      );
      
      const reserveData = await poolContract.getReserveData(CUSD_ADDRESS);
      acUSDAddress = reserveData[7]; // aTokenAddress is at index 7
      console.log("✅ acUSD address:", acUSDAddress);
    } catch (error) {
      console.error("❌ Failed to query acUSD address:", error);
      throw new Error("Could not determine acUSD address. Please set CELO_MAINNET_ACUSD_ADDRESS manually.");
    }
  }

  // ========== STEP 2: Deploy AaveV3Strategy ==========
  
  console.log("\n📝 Step 2: Deploying AaveV3Strategy...");
  
  const AaveV3StrategyArtifact = await hre.artifacts.readArtifact("AaveV3Strategy");
  const AaveV3StrategyFactory = new ethers.ContractFactory(
    AaveV3StrategyArtifact.abi,
    AaveV3StrategyArtifact.bytecode,
    deployer
  );
  
  const aaveStrategy = await AaveV3StrategyFactory.deploy(
    CUSD_ADDRESS,
    acUSDAddress,
    POOL_ADDRESSES_PROVIDER
  );
  
  await aaveStrategy.waitForDeployment();
  const aaveStrategyAddress = await aaveStrategy.getAddress();
  console.log("✅ AaveV3Strategy deployed to:", aaveStrategyAddress);

  // ========== STEP 3: Deploy SelfProtocolVerifier ==========
  
  console.log("\n📝 Step 3: Deploying SelfProtocolVerifier...");
  
  // Create verification config
  const SelfUtils = await ethers.getContractFactory("SelfUtils");
  // Note: We'll use the contract's constructor which handles config creation
  
  const SelfProtocolVerifierArtifact = await hre.artifacts.readArtifact("SelfProtocolVerifier");
  const SelfProtocolVerifierFactory = new ethers.ContractFactory(
    SelfProtocolVerifierArtifact.abi,
    SelfProtocolVerifierArtifact.bytecode,
    deployer
  );
  
  // The constructor takes hub, scopeSeed, and config
  // Config will be created with default values (age 18+, forbidden countries, OFAC enabled)
  // We need to encode the config struct - but since it's complex, we'll let the contract handle defaults
  
  // For now, we'll deploy with a minimal config that the contract will enhance
  // The contract constructor will add forbidden countries if not provided
  const selfVerifier = await SelfProtocolVerifierFactory.deploy(
    IDENTITY_VERIFICATION_HUB,
    SCOPE_SEED,
    {
      olderThan: 18,
      forbiddenCountries: [], // Contract will add default forbidden countries
      ofacEnabled: true
    }
  );
  
  await selfVerifier.waitForDeployment();
  const selfVerifierAddress = await selfVerifier.getAddress();
  console.log("✅ SelfProtocolVerifier deployed to:", selfVerifierAddress);

  // ========== STEP 4: Deploy SeedVault (UUPS Proxy) ==========
  
  console.log("\n📝 Step 4: Deploying SeedVault (UUPS Proxy)...");
  
  // Deploy implementation
  const SeedVaultArtifact = await hre.artifacts.readArtifact("SeedVault");
  const SeedVaultFactory = new ethers.ContractFactory(
    SeedVaultArtifact.abi,
    SeedVaultArtifact.bytecode,
    deployer
  );
  
  const vaultImplementation = await SeedVaultFactory.deploy();
  await vaultImplementation.waitForDeployment();
  const vaultImplementationAddress = await vaultImplementation.getAddress();
  console.log("✅ SeedVault implementation deployed to:", vaultImplementationAddress);
  
  // Deploy UUPS Proxy
  const ERC1967ProxyArtifact = await hre.artifacts.readArtifact("ERC1967Proxy");
  const ProxyFactory = new ethers.ContractFactory(
    ERC1967ProxyArtifact.abi,
    ERC1967ProxyArtifact.bytecode,
    deployer
  );
  
  // Encode initialize function call
  const vaultInterface = new ethers.Interface(SeedVaultArtifact.abi);
  const initData = vaultInterface.encodeFunctionData("initialize", [
    CUSD_ADDRESS,
    aaveStrategyAddress,
    selfVerifierAddress,
    MAX_USER_DEPOSIT,
    MAX_TOTAL_DEPOSIT
  ]);
  
  const proxy = await ProxyFactory.deploy(vaultImplementationAddress, initData);
  await proxy.waitForDeployment();
  const vaultAddress = await proxy.getAddress();
  console.log("✅ SeedVault proxy deployed to:", vaultAddress);

  // ========== STEP 5: Link Contracts ==========
  
  console.log("\n📝 Step 5: Linking contracts...");
  
  // Set vault in strategy
  const setVaultTx = await aaveStrategy.setVault(vaultAddress);
  await setVaultTx.wait();
  console.log("✅ Set vault in AaveV3Strategy");
  
  // Authorize vault in verifier
  const authorizeTx = await selfVerifier.authorizeCaller(vaultAddress);
  await authorizeTx.wait();
  console.log("✅ Authorized vault in SelfProtocolVerifier");

  // ========== DEPLOYMENT SUMMARY ==========
  
  const networkInfo = await provider.getNetwork();
  
  const deploymentSummary = {
    network: "Celo Mainnet",
    chainId: Number(networkInfo.chainId),
    contracts: {
      vault: vaultAddress,
      vaultImplementation: vaultImplementationAddress,
      aaveStrategy: aaveStrategyAddress,
      selfVerifier: selfVerifierAddress,
    },
    configuration: {
      identityVerificationHub: IDENTITY_VERIFICATION_HUB,
      poolAddressesProvider: POOL_ADDRESSES_PROVIDER,
      cUSD: CUSD_ADDRESS,
      acUSD: acUSDAddress,
      scopeSeed: SCOPE_SEED,
      maxUserDeposit: ethers.formatEther(MAX_USER_DEPOSIT),
      maxTotalDeposit: ethers.formatEther(MAX_TOTAL_DEPOSIT),
    },
    deployer: deployer.address,
  };

  console.log("\n============================================================");
  console.log("💾 Deployment summary:");
  console.log(JSON.stringify(deploymentSummary, null, 2));
  console.log("============================================================\n");

  console.log("🎉 Deployment complete! Update your frontend with the new contract addresses.");
  console.log("\n📋 Next steps:");
  console.log("  1. Verify all contracts on CeloScan");
  console.log("  2. Update frontend environment variables:");
  console.log("     - NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS_MAINNET=" + vaultAddress);
  console.log("     - NEXT_PUBLIC_SELF_PROTOCOL_ADDRESS_MAINNET=" + selfVerifierAddress);
  console.log("     - NEXT_PUBLIC_CUSD_CONTRACT_ADDRESS_MAINNET=" + CUSD_ADDRESS);
  console.log("     - NEXT_PUBLIC_ACUSD_CONTRACT_ADDRESS_MAINNET=" + acUSDAddress);
  console.log("  3. Update frontend endpointType from 'celo-staging' to 'celo'");
  console.log("  4. Test the deployment with a small deposit");
  console.log("  5. Monitor contract interactions");
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});

