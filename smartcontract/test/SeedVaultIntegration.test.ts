import { expect } from "chai";
import hre from "hardhat";
import helpers from "@nomicfoundation/hardhat-network-helpers";
const { loadFixture } = helpers;

const { ethers } = hre;

describe("SeedVault Integration", function () {
  async function deployVaultIntegrationFixture() {
    const [owner, user1, user2] = await ethers.getSigners();
    
    // Deploy Mock cUSD token
    const MockToken = await ethers.getContractFactory("MockToken");
    const mockCUSD = await MockToken.deploy("Celo USD", "cUSD", ethers.parseEther("1000000"));
    
    // Deploy MockAavePool
    const MockAavePool = await ethers.getContractFactory("MockAavePool");
    const mockPool = await MockAavePool.deploy();
    
    // Deploy MockAToken
    const MockAToken = await ethers.getContractFactory("MockAToken");
    const mockAToken = await MockAToken.deploy(
      await mockCUSD.getAddress(),
      await mockPool.getAddress(),
      "Mock Aave Celo USD",
      "maCUSD"
    );
    
    // Deploy MockSelfProtocol for testing
    const MockSelfProtocol = await ethers.getContractFactory("MockSelfProtocol");
    const mockSelfProtocol = await MockSelfProtocol.deploy();
    
    // Deploy SeedVault
    const SeedVault = await ethers.getContractFactory("SeedVault");
    const vault = await SeedVault.deploy(
      await mockCUSD.getAddress(),
      await mockAToken.getAddress(),
      await mockPool.getAddress(),
      await mockSelfProtocol.getAddress()
    );
    
    return { vault, mockCUSD, mockPool, mockAToken, mockSelfProtocol, owner, user1, user2 };
  }

  describe("Vault Deployment", function () {
    it("Should deploy with correct addresses", async function () {
      const { vault, mockCUSD, mockAToken, mockPool, mockSelfProtocol } = await loadFixture(deployVaultIntegrationFixture);
      
      expect(await vault.cUSD()).to.equal(await mockCUSD.getAddress());
      expect(await vault.acUSD()).to.equal(await mockAToken.getAddress());
      expect(await vault.aavePool()).to.equal(await mockPool.getAddress());
      expect(await vault.selfProtocol()).to.equal(await mockSelfProtocol.getAddress());
    });

    it("Should have correct limits", async function () {
      const { vault } = await loadFixture(deployVaultIntegrationFixture);
      
      expect(await vault.MIN_DEPOSIT()).to.equal(ethers.parseEther("1"));
      expect(await vault.MAX_DEPOSIT()).to.equal(ethers.parseEther("10000"));
      expect(await vault.MAX_TVL()).to.equal(ethers.parseEther("100000"));
    });
  });

  describe("Deposit Flow", function () {
    it("Should handle complete deposit flow", async function () {
      const { vault, mockCUSD, mockPool, mockSelfProtocol, owner, user1 } = await loadFixture(deployVaultIntegrationFixture);
      
      const depositAmount = ethers.parseEther("10");
      
      // Setup: Verify user1 first (required for deposits)
      await mockSelfProtocol.setVerified(user1.address, true);
      
      // Setup: Mint cUSD to user1
      await mockCUSD.mint(user1.address, depositAmount);
      
      // User approves vault to spend cUSD
      await mockCUSD.connect(user1).approve(await vault.getAddress(), depositAmount);
      
      // User deposits to vault
      const depositTx = await vault.connect(user1).deposit(depositAmount);
      await depositTx.wait();
      
      // Check vault stats
      const stats = await vault.getVaultStats();
      expect(stats[0]).to.equal(depositAmount); // totalAssets
      expect(stats[1]).to.equal(depositAmount); // totalShares (1:1 initially)
      expect(stats[4]).to.equal(depositAmount); // totalDeposited
      
      // Check user balance
      const userBalance = await vault.balanceOf(user1.address);
      expect(userBalance).to.equal(depositAmount);
    });

    it("Should deploy funds to Aave pool", async function () {
      const { vault, mockCUSD, mockPool, mockSelfProtocol, owner, user1 } = await loadFixture(deployVaultIntegrationFixture);
      
      const depositAmount = ethers.parseEther("10");
      
      // Setup: Verify user1 first (required for deposits)
      await mockSelfProtocol.setVerified(user1.address, true);
      
      // Setup: Mint cUSD to user1
      await mockCUSD.mint(user1.address, depositAmount);
      await mockCUSD.connect(user1).approve(await vault.getAddress(), depositAmount);
      
      // User deposits to vault
      await vault.connect(user1).deposit(depositAmount);
      
      // Check if vault deployed funds to Aave
      const poolBalance = await mockCUSD.balanceOf(await mockPool.getAddress());
      expect(poolBalance).to.be.greaterThan(0);
      
      // Check vault reserve balance
      const vaultBalance = await mockCUSD.balanceOf(await vault.getAddress());
      expect(vaultBalance).to.be.greaterThan(0);
      
      // Total should equal deposit
      expect(poolBalance + vaultBalance).to.equal(depositAmount);
    });
  });

  describe("Withdraw Flow", function () {
    it("Should handle complete withdraw flow", async function () {
      const { vault, mockCUSD, mockSelfProtocol, owner, user1 } = await loadFixture(deployVaultIntegrationFixture);
      
      const depositAmount = ethers.parseEther("10");
      const withdrawAmount = ethers.parseEther("5");
      
      // Setup: Verify user1 first (required for deposits)
      await mockSelfProtocol.setVerified(user1.address, true);
      
      // Setup: Deposit first
      await mockCUSD.mint(user1.address, depositAmount);
      await mockCUSD.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount);
      
      // User withdraws
      const withdrawTx = await vault.connect(user1).withdraw(withdrawAmount);
      await withdrawTx.wait();
      
      // Check user balance after withdrawal
      const userBalance = await vault.balanceOf(user1.address);
      expect(userBalance).to.equal(depositAmount - withdrawAmount);
      
      // Check vault stats
      const stats = await vault.getVaultStats();
      expect(stats[0]).to.equal(depositAmount - withdrawAmount); // totalAssets
      expect(stats[5]).to.equal(withdrawAmount); // totalWithdrawn
    });
  });

  describe("Strategy Management", function () {
    it("Should allow strategy changes", async function () {
      const { vault, mockSelfProtocol, owner } = await loadFixture(deployVaultIntegrationFixture);
      
      // Verify owner first (required for strategy changes)
      await mockSelfProtocol.setVerified(owner.address, true);
      
      // Check initial strategy (should be CONSERVATIVE = 0)
      const initialStrategy = await vault.userStrategy(owner.address);
      expect(initialStrategy).to.equal(0);
      
      // Change to BALANCED strategy (1)
      await vault.connect(owner).changeStrategy(1);
      
      const newStrategy = await vault.userStrategy(owner.address);
      expect(newStrategy).to.equal(1);
    });
  });

  describe("Self Protocol Verification", function () {
    it("Should require verification before deposit", async function () {
      const { vault, mockCUSD, user1 } = await loadFixture(deployVaultIntegrationFixture);
      
      const depositAmount = ethers.parseEther("10");
      
      // Setup: Mint cUSD to user1 but don't verify
      await mockCUSD.mint(user1.address, depositAmount);
      await mockCUSD.connect(user1).approve(await vault.getAddress(), depositAmount);
      
      // Try to deposit without verification - should fail
      await expect(
        vault.connect(user1).deposit(depositAmount)
      ).to.be.revertedWithCustomError(vault, "NotVerified");
    });

    it("Should allow deposit after verification", async function () {
      const { vault, mockCUSD, mockSelfProtocol, user1 } = await loadFixture(deployVaultIntegrationFixture);
      
      const depositAmount = ethers.parseEther("10");
      
      // Verify user1
      await mockSelfProtocol.setVerified(user1.address, true);
      
      // Setup: Mint cUSD to user1
      await mockCUSD.mint(user1.address, depositAmount);
      await mockCUSD.connect(user1).approve(await vault.getAddress(), depositAmount);
      
      // Deposit should succeed
      await expect(vault.connect(user1).deposit(depositAmount)).to.not.be.reverted;
    });
  });

  describe("APY and Earnings", function () {
    it("Should return correct APY", async function () {
      const { vault } = await loadFixture(deployVaultIntegrationFixture);
      
      const apy = await vault.getCurrentAPY();
      expect(apy).to.equal(350); // 3.5% APY
    });

    it("Should calculate earnings correctly", async function () {
      const { vault, mockCUSD, mockSelfProtocol, user1 } = await loadFixture(deployVaultIntegrationFixture);
      
      const depositAmount = ethers.parseEther("100");
      
      // Setup: Verify user1 first (required for deposits)
      await mockSelfProtocol.setVerified(user1.address, true);
      
      // Setup: Deposit
      await mockCUSD.mint(user1.address, depositAmount);
      await mockCUSD.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount);
      
      // Check initial earnings (should be 0)
      const initialEarnings = await vault.getEarnings(user1.address);
      expect(initialEarnings).to.equal(0);
      
      // Fast forward time and check earnings
      await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]); // 1 year
      await ethers.provider.send("evm_mine");
      
      const earningsAfterYear = await vault.getEarnings(user1.address);
      expect(earningsAfterYear).to.be.greaterThan(0);
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow owner to pause/unpause", async function () {
      const { vault, owner } = await loadFixture(deployVaultIntegrationFixture);
      
      // Initially not paused
      expect(await vault.paused()).to.be.false;
      
      // Pause
      await vault.connect(owner).pause();
      expect(await vault.paused()).to.be.true;
      
      // Unpause
      await vault.connect(owner).unpause();
      expect(await vault.paused()).to.be.false;
    });

    it("Should allow emergency withdraw when paused", async function () {
      const { vault, mockCUSD, mockSelfProtocol, owner, user1 } = await loadFixture(deployVaultIntegrationFixture);
      
      const depositAmount = ethers.parseEther("10");
      
      // Setup: Verify user1 first (required for deposits)
      await mockSelfProtocol.setVerified(user1.address, true);
      
      // Setup: Deposit
      await mockCUSD.mint(user1.address, depositAmount);
      await mockCUSD.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount);
      
      // Pause vault
      await vault.connect(owner).pause();
      
      // Emergency withdraw
      await vault.connect(owner).emergencyWithdraw(await mockCUSD.getAddress(), depositAmount);
      
      // Check owner received funds
      const ownerBalance = await mockCUSD.balanceOf(owner.address);
      expect(ownerBalance).to.equal(depositAmount);
    });
  });
});
