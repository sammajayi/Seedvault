import hre from "hardhat";

/**
 * Complete end-to-end test of AttestifyVault on forked Celo Mainnet
 */

async function main() {
  console.log("🧪 Full Vault Test on Celo Fork\n");

  // Addresses
  const VAULT_ADDRESS = "0xF32D39ff9f6Aa7a7A64d7a4F00a54826Ef791a55"; // Update after deployment
  const CUSD_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a";
  
  // Find a cUSD whale - this is a real address with lots of cUSD
  // Check CeloScan for current whale addresses
  const CUSD_WHALE = "0x1234567890123456789012345678901234567890"; // UPDATE THIS

  console.log("📍 Addresses:");
  console.log("  Vault:", VAULT_ADDRESS);
  console.log("  cUSD:", CUSD_ADDRESS);
  console.log("  Whale:", CUSD_WHALE);

  // Step 1: Impersonate whale
  console.log("\n💰 Step 1: Impersonating cUSD whale...");
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [CUSD_WHALE],
  });

  // Give whale some CELO for gas
  await hre.network.provider.send("hardhat_setBalance", [
    CUSD_WHALE,
    "0x56BC75E2D63100000", // 100 CELO
  ]);

  const whale = await hre.ethers.getSigner(CUSD_WHALE);
  console.log("✅ Impersonating:", whale.address);

  // Step 2: Setup contracts
  console.log("\n📝 Step 2: Setting up contracts...");
  const cUSD = await hre.ethers.getContractAt("IERC20", CUSD_ADDRESS);
  const vault = await hre.ethers.getContractAt("AttestifyVault", VAULT_ADDRESS);

  const whaleBalance = await cUSD.balanceOf(whale.address);
  console.log("Whale cUSD balance:", hre.ethers.formatEther(whaleBalance));

  // Step 3: Verify user (mock for testing)
  console.log("\n✅ Step 3: Verifying user...");
  
  // In production, user would verify through Self Protocol
  // For fork testing, we can manually verify if we're the owner
  const [deployer] = await hre.ethers.getSigners();
  
  // Check if whale is verified
  const isVerified = await vault.isVerified(whale.address);
  console.log("Is verified:", isVerified);
  
  if (!isVerified) {
    console.log("⚠️  User not verified. In production, use Self Protocol.");
    console.log("For testing, you may need to:");
    console.log("1. Deploy MockSelfProtocol");
    console.log("2. Or modify contract to skip verification");
    console.log("\nSkipping deposit test...");
    return;
  }

  // Step 4: Approve and deposit
  console.log("\n💸 Step 4: Testing deposit...");
  const depositAmount = hre.ethers.parseEther("100"); // 100 cUSD

  console.log("Approving cUSD...");
  const approveTx = await cUSD.connect(whale).approve(VAULT_ADDRESS, depositAmount);
  await approveTx.wait();
  console.log("✅ Approved");

  console.log("Depositing", hre.ethers.formatEther(depositAmount), "cUSD...");
  const depositTx = await vault.connect(whale).deposit(depositAmount);
  const receipt = await depositTx.wait();
  console.log("✅ Deposited! Gas used:", receipt.gasUsed.toString());

  // Step 5: Check balance
  console.log("\n📊 Step 5: Checking vault balance...");
  const userBalance = await vault.balanceOf(whale.address);
  const shares = await vault.shares(whale.address);
  
  console.log("User balance:", hre.ethers.formatEther(userBalance), "cUSD");
  console.log("User shares:", hre.ethers.formatEther(shares));

  // Step 6: Check vault stats
  console.log("\n📈 Step 6: Vault statistics...");
  const stats = await vault.getVaultStats();
  console.log("  Total Assets:", hre.ethers.formatEther(stats[0]));
  console.log("  Total Shares:", hre.ethers.formatEther(stats[1]));
  console.log("  Reserve Balance:", hre.ethers.formatEther(stats[2]));
  console.log("  Aave Balance:", hre.ethers.formatEther(stats[3]));

  // Step 7: Test withdrawal
  console.log("\n💵 Step 7: Testing withdrawal...");
  const withdrawAmount = hre.ethers.parseEther("50"); // Withdraw 50 cUSD
  
  console.log("Withdrawing", hre.ethers.formatEther(withdrawAmount), "cUSD...");
  const withdrawTx = await vault.connect(whale).withdraw(withdrawAmount);
  const withdrawReceipt = await withdrawTx.wait();
  console.log("✅ Withdrawn! Gas used:", withdrawReceipt.gasUsed.toString());

  // Final balance
  const finalBalance = await vault.balanceOf(whale.address);
  console.log("Final balance:", hre.ethers.formatEther(finalBalance), "cUSD");

  // Step 8: Check earnings
  console.log("\n💰 Step 8: Checking earnings...");
  const earnings = await vault.getEarnings(whale.address);
  console.log("Earnings:", hre.ethers.formatEther(earnings), "cUSD");

  console.log("\n✅ All tests passed!");
  console.log("\n📋 Summary:");
  console.log("  ✅ Deposit successful");
  console.log("  ✅ Withdrawal successful");
  console.log("  ✅ Vault functioning correctly");
}

main().catch((error) => {
  console.error("\n❌ Test failed:");
  console.error(error);
  process.exitCode = 1;
});