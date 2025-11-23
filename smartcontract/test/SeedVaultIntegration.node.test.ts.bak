import { test, describe } from "node:test";
import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;

describe("SeedVault Integration (node:test)", function () {
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

  test("Should deploy with correct addresses", async function () {
    const { vault, mockCUSD, mockAToken, mockPool, mockSelfProtocol } = await deployVaultIntegrationFixture();
    
    expect(await vault.cUSD()).to.equal(await mockCUSD.getAddress());
    expect(await vault.acUSD()).to.equal(await mockAToken.getAddress());
    expect(await vault.aavePool()).to.equal(await mockPool.getAddress());
    expect(await vault.selfProtocol()).to.equal(await mockSelfProtocol.getAddress());
  });

  test("Should require verification before deposit", async function () {
    const { vault, mockCUSD, user1 } = await deployVaultIntegrationFixture();
    
    const depositAmount = ethers.parseEther("10");
    
    // Setup: Mint cUSD to user1 but don't verify
    await mockCUSD.mint(user1.address, depositAmount);
    await mockCUSD.connect(user1).approve(await vault.getAddress(), depositAmount);
    
    // Try to deposit without verification - should fail
    await expect(
      vault.connect(user1).deposit(depositAmount)
    ).to.be.revertedWithCustomError(vault, "NotVerified");
  });
});

