import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;

describe("MockAavePool Basic Tests", function () {
  let mockPool: any;
  let mockCUSD: any;
  let owner: any;
  let user1: any;

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();
    
    // Deploy MockAavePool
    const MockAavePool = await ethers.getContractFactory("MockAavePool");
    mockPool = await MockAavePool.deploy();
    
    // Deploy Mock cUSD token
    const MockToken = await ethers.getContractFactory("MockToken");
    mockCUSD = await MockToken.deploy("Celo USD", "cUSD", ethers.parseEther("1000000"));
  });

  it("Should deploy successfully", async function () {
    expect(await mockPool.getAddress()).to.be.properAddress;
    expect(await mockPool.owner()).to.equal(owner.address);
  });

  it("Should have correct APY", async function () {
    expect(await mockPool.getAPY()).to.equal(500); // 5% APY
  });

  it("Should allow supply", async function () {
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

  it("Should allow withdraw", async function () {
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

  it("Should return getUserAccountData", async function () {
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
  });

  it("Should return getReserveData", async function () {
    // Test getReserveData
    const reserveData = await mockPool.getReserveData(await mockCUSD.getAddress());
    expect(reserveData[0]).to.equal(0); // configuration
    expect(reserveData[1]).to.equal(ethers.parseEther("1")); // liquidityIndex
  });

  it("Should allow emergency withdraw", async function () {
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
});
