import { expect } from "chai";
import hre from "hardhat";
import { loadFixture } from "./helpers/loadFixture.js";

const { ethers } = hre;

describe("MockAToken", function () {
  async function deployMockATokenFixture() {
    const [owner, user1, pool] = await ethers.getSigners();

    // Deploy MockAToken
    const MockAToken = await ethers.getContractFactory("MockAToken");
    const mockAToken = await MockAToken.deploy(
      ethers.ZeroAddress, // underlying asset (dummy)
      pool.address, // pool address
      "Mock Aave Celo USD",
      "maCUSD"
    );

    return { mockAToken, owner, user1, pool };
  }

  describe("Deployment", function () {
    it("Should set the right underlying asset", async function () {
      const { mockAToken } = await loadFixture(deployMockATokenFixture);
      expect(await mockAToken.underlyingAsset()).to.equal(ethers.ZeroAddress);
    });

    it("Should set the right pool address", async function () {
      const { mockAToken, pool } = await loadFixture(deployMockATokenFixture);
      expect(await mockAToken.pool()).to.equal(pool.address);
    });

    it("Should have correct name and symbol", async function () {
      const { mockAToken } = await loadFixture(deployMockATokenFixture);
      expect(await mockAToken.name()).to.equal("Mock Aave Celo USD");
      expect(await mockAToken.symbol()).to.equal("maCUSD");
    });
  });

  describe("Mint Function", function () {
    it("Should allow pool to mint tokens", async function () {
      const { mockAToken, user1, pool } = await loadFixture(deployMockATokenFixture);

      const mintAmount = ethers.parseEther("100");

      // Pool mints tokens to user1
      await mockAToken.connect(pool).mint(user1.address, mintAmount);

      // Check user balance
      const userBalance = await mockAToken.balanceOf(user1.address);
      expect(userBalance).to.equal(mintAmount);
    });

    it("Should reject non-pool minting", async function () {
      const { mockAToken, user1 } = await loadFixture(deployMockATokenFixture);

      const mintAmount = ethers.parseEther("100");

      await expect(
        mockAToken.connect(user1).mint(user1.address, mintAmount)
      ).to.be.revertedWith("Only pool can mint aTokens");
    });
  });

  describe("Burn Function", function () {
    it("Should allow pool to burn tokens", async function () {
      const { mockAToken, user1, pool } = await loadFixture(deployMockATokenFixture);

      const mintAmount = ethers.parseEther("100");
      const burnAmount = ethers.parseEther("50");

      // Setup: Pool mints tokens to user1
      await mockAToken.connect(pool).mint(user1.address, mintAmount);

      // Pool burns tokens from user1
      await mockAToken.connect(pool).burn(user1.address, burnAmount);

      // Check remaining balance
      const remainingBalance = await mockAToken.balanceOf(user1.address);
      expect(remainingBalance).to.equal(mintAmount - burnAmount);
    });

    it("Should reject non-pool burning", async function () {
      const { mockAToken, user1, pool } = await loadFixture(deployMockATokenFixture);

      const mintAmount = ethers.parseEther("100");
      const burnAmount = ethers.parseEther("50");

      // Setup: Pool mints tokens to user1
      await mockAToken.connect(pool).mint(user1.address, mintAmount);

      // Try to burn as user1
      await expect(
        mockAToken.connect(user1).burn(user1.address, burnAmount)
      ).to.be.revertedWith("Only pool can burn aTokens");
    });
  });
});
