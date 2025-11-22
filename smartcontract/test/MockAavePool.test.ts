import { expect } from "chai";
import hre from "hardhat";
import helpers from "@nomicfoundation/hardhat-network-helpers";
const { loadFixture } = helpers;

const { ethers } = hre;

describe("MockAavePool", function () {
  async function deployMockAavePoolFixture() {
    const [owner, user1, user2] = await ethers.getSigners();
    
    // Deploy MockAavePool
    const MockAavePool = await ethers.getContractFactory("MockAavePool");
    const mockPool = await MockAavePool.deploy();
    
    // Deploy MockAToken
    const MockAToken = await ethers.getContractFactory("MockAToken");
    const mockAToken = await MockAToken.deploy(
      ethers.ZeroAddress, // We'll use a dummy address for testing
      await mockPool.getAddress(),
      "Mock Aave Celo USD",
      "maCUSD"
    );
    
    // Deploy Mock cUSD token for testing
    const MockToken = await ethers.getContractFactory("MockToken");
    const mockCUSD = await MockToken.deploy("Celo USD", "cUSD", ethers.parseEther("1000000"));
    
    return { mockPool, mockAToken, mockCUSD, owner, user1, user2 };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { mockPool, owner } = await loadFixture(deployMockAavePoolFixture);
      expect(await mockPool.owner()).to.equal(owner.address);
    });

    it("Should have correct APY", async function () {
      const { mockPool } = await loadFixture(deployMockAavePoolFixture);
      expect(await mockPool.getAPY()).to.equal(500); // 5% APY
    });
  });

  describe("Supply Function", function () {
    it("Should allow users to supply tokens", async function () {
      const { mockPool, mockCUSD, user1 } = await loadFixture(deployMockAavePoolFixture);
      
      const supplyAmount = ethers.parseEther("100");
      
      // Mint tokens to user1
      await mockCUSD.mint(user1.address, supplyAmount);
      
      // Approve the pool to spend tokens
      await mockCUSD.connect(user1).approve(await mockPool.getAddress(), supplyAmount);
      
      // Supply tokens
      await mockPool.connect(user1).supply(
        await mockCUSD.getAddress(),
        supplyAmount,
        user1.address,
        0 // referral code
      );
      
      // Check user balance
      const userBalance = await mockPool.getUserBalance(user1.address);
      expect(userBalance).to.equal(supplyAmount);
    });

    it("Should reject zero amount supply", async function () {
      const { mockPool, mockCUSD, user1 } = await loadFixture(deployMockAavePoolFixture);
      
      await expect(
        mockPool.connect(user1).supply(
          await mockCUSD.getAddress(),
          0,
          user1.address,
          0
        )
      ).to.be.revertedWith("Amount must be greater than 0");
    });
  });

  describe("Withdraw Function", function () {
    it("Should allow users to withdraw tokens", async function () {
      const { mockPool, mockCUSD, user1 } = await loadFixture(deployMockAavePoolFixture);
      
      const supplyAmount = ethers.parseEther("100");
      const withdrawAmount = ethers.parseEther("50");
      
      // Setup: Mint and supply tokens
      await mockCUSD.mint(user1.address, supplyAmount);
      await mockCUSD.connect(user1).approve(await mockPool.getAddress(), supplyAmount);
      await mockPool.connect(user1).supply(
        await mockCUSD.getAddress(),
        supplyAmount,
        user1.address,
        0
      );
      
      // Withdraw tokens
      await mockPool.connect(user1).withdraw(
        await mockCUSD.getAddress(),
        withdrawAmount,
        user1.address
      );
      
      // Check remaining balance
      const remainingBalance = await mockPool.getUserBalance(user1.address);
      expect(remainingBalance).to.equal(supplyAmount - withdrawAmount);
    });

    it("Should reject insufficient balance withdrawal", async function () {
      const { mockPool, mockCUSD, user1 } = await loadFixture(deployMockAavePoolFixture);
      
      const supplyAmount = ethers.parseEther("100");
      const withdrawAmount = ethers.parseEther("150");
      
      // Setup: Mint and supply tokens
      await mockCUSD.mint(user1.address, supplyAmount);
      await mockCUSD.connect(user1).approve(await mockPool.getAddress(), supplyAmount);
      await mockPool.connect(user1).supply(
        await mockCUSD.getAddress(),
        supplyAmount,
        user1.address,
        0
      );
      
      // Try to withdraw more than available
      await expect(
        mockPool.connect(user1).withdraw(
          await mockCUSD.getAddress(),
          withdrawAmount,
          user1.address
        )
      ).to.be.revertedWith("Insufficient balance");
    });
  });

  describe("Aave Compatibility Functions", function () {
    it("Should return correct getUserAccountData", async function () {
      const { mockPool, mockCUSD, user1 } = await loadFixture(deployMockAavePoolFixture);
      
      const supplyAmount = ethers.parseEther("100");
      
      // Setup: Supply tokens
      await mockCUSD.mint(user1.address, supplyAmount);
      await mockCUSD.connect(user1).approve(await mockPool.getAddress(), supplyAmount);
      await mockPool.connect(user1).supply(
        await mockCUSD.getAddress(),
        supplyAmount,
        user1.address,
        0
      );
      
      // Test getUserAccountData
      const accountData = await mockPool.getUserAccountData(user1.address);
      expect(accountData[0]).to.equal(supplyAmount); // totalCollateralETH
      expect(accountData[1]).to.equal(0); // totalDebtETH
      expect(accountData[2]).to.equal(ethers.MaxUint256); // availableBorrowsETH
    });

    it("Should return correct getReserveData", async function () {
      const { mockPool, mockCUSD } = await loadFixture(deployMockAavePoolFixture);
      
      // Test getReserveData
      const reserveData = await mockPool.getReserveData(await mockCUSD.getAddress());
      expect(reserveData[0]).to.equal(0); // configuration
      expect(reserveData[1]).to.equal(ethers.parseEther("1")); // liquidityIndex
      expect(reserveData[3]).to.equal(ethers.parseEther("0.05")); // currentLiquidityRate (5% APY)
    });

    it("Should return totalAssets", async function () {
      const { mockPool } = await loadFixture(deployMockAavePoolFixture);
      
      // Test totalAssets
      const totalAssets = await mockPool.totalAssets();
      expect(totalAssets).to.be.a("bigint");
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow owner to emergency withdraw all tokens", async function () {
      const { mockPool, mockCUSD, owner, user1 } = await loadFixture(deployMockAavePoolFixture);
      
      const supplyAmount = ethers.parseEther("100");
      
      // Setup: User supplies tokens
      await mockCUSD.mint(user1.address, supplyAmount);
      await mockCUSD.connect(user1).approve(await mockPool.getAddress(), supplyAmount);
      await mockPool.connect(user1).supply(
        await mockCUSD.getAddress(),
        supplyAmount,
        user1.address,
        0
      );
      
      // Owner emergency withdraws
      await mockPool.connect(owner).emergencyWithdraw(await mockCUSD.getAddress());
      
      // Check owner received tokens
      const ownerBalance = await mockCUSD.balanceOf(owner.address);
      expect(ownerBalance).to.equal(supplyAmount);
    });

    it("Should reject non-owner emergency withdraw", async function () {
      const { mockPool, mockCUSD, user1 } = await loadFixture(deployMockAavePoolFixture);
      
      await expect(
        mockPool.connect(user1).emergencyWithdraw(await mockCUSD.getAddress())
      ).to.be.revertedWithCustomError(mockPool, "OwnableUnauthorizedAccount");
    });
  });

  describe("Interest Calculation", function () {
    it("Should calculate interest over time", async function () {
      const { mockPool, mockCUSD, user1 } = await loadFixture(deployMockAavePoolFixture);
      
      const supplyAmount = ethers.parseEther("100");
      
      // Setup: Supply tokens
      await mockCUSD.mint(user1.address, supplyAmount);
      await mockCUSD.connect(user1).approve(await mockPool.getAddress(), supplyAmount);
      await mockPool.connect(user1).supply(
        await mockCUSD.getAddress(),
        supplyAmount,
        user1.address,
        0
      );
      
      // Fast forward time (simulate 1 year)
      await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]); // 1 year
      await ethers.provider.send("evm_mine");
      
      // Check balance with interest
      const balanceWithInterest = await mockPool.getUserBalance(user1.address);
      expect(balanceWithInterest).to.be.greaterThan(supplyAmount);
      
      // Should be approximately 5% more (allowing for rounding)
      const expectedInterest = supplyAmount * 5n / 100n; // 5% of 100
      const actualInterest = balanceWithInterest - supplyAmount;
      expect(actualInterest).to.be.closeTo(expectedInterest, ethers.parseEther("0.1"));
    });
  });
});
