import { ethers } from "ethers";

// Test if the deployed SelfProtocolVerification contract is callable
async function main() {
  const CONTRACT_ADDRESS = "0x2fB9C37215410f97e0FE2906c0E940aA483DeCf6";
  const RPC_URL = process.env.CELO_SEPOLIA_RPC_URL || "https://rpc.ankr.com/celo_sepolia";
  
  console.log("🔍 Testing SelfProtocolVerification contract...\n");
  console.log("Contract Address:", CONTRACT_ADDRESS);
  console.log("RPC URL:", RPC_URL);
  console.log("");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  
  // Check 1: Contract has code
  console.log("1️⃣ Checking if contract has code...");
  const code = await provider.getCode(CONTRACT_ADDRESS);
  if (code === "0x") {
    console.error("❌ Contract has no code! Contract not deployed or address is wrong.");
    return;
  }
  console.log("✅ Contract has code (length:", code.length, "characters)");
  console.log("");

  // Check 2: Try to call getConfigId (view function)
  console.log("2️⃣ Testing getConfigId() function...");
  try {
    // Minimal ABI for getConfigId
    const abi = [
      "function getConfigId(bytes32 destinationChainId, bytes32 userIdentifier, bytes userDefinedData) public view returns (bytes32)"
    ];
    
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);
    
    // Call with dummy parameters
    const destinationChainId = ethers.ZeroHash; // bytes32(0)
    const userIdentifier = ethers.ZeroHash; // bytes32(0)
    const userDefinedData = "0x"; // empty bytes
    
    const configId = await contract.getConfigId(destinationChainId, userIdentifier, userDefinedData);
    
    if (configId === ethers.ZeroHash) {
      console.warn("⚠️ getConfigId() returned zero bytes32. This might indicate the contract wasn't properly initialized.");
    } else {
      console.log("✅ getConfigId() returned:", configId);
    }
  } catch (error: any) {
    console.error("❌ Failed to call getConfigId():", error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
    return;
  }
  console.log("");

  // Check 3: Try to read verificationConfigId public variable
  console.log("3️⃣ Testing verificationConfigId public variable...");
  try {
    const abi = [
      "function verificationConfigId() public view returns (bytes32)"
    ];
    
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);
    const configId = await contract.verificationConfigId();
    
    if (configId === ethers.ZeroHash) {
      console.warn("⚠️ verificationConfigId is zero. Contract might not be properly initialized.");
    } else {
      console.log("✅ verificationConfigId:", configId);
    }
  } catch (error: any) {
    console.error("❌ Failed to read verificationConfigId:", error.message);
  }
  console.log("");

  // Check 4: Try to read isVerified for a test address
  console.log("4️⃣ Testing isVerified() function...");
  try {
    const abi = [
      "function isVerified(address user) public view returns (bool)"
    ];
    
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);
    const testAddress = "0x0000000000000000000000000000000000000001";
    const isVerified = await contract.isVerified(testAddress);
    console.log("✅ isVerified() works. Test address verified:", isVerified);
  } catch (error: any) {
    console.error("❌ Failed to call isVerified():", error.message);
  }
  console.log("");

  console.log("✅ Contract appears to be callable!");
  console.log("\n💡 If getConfigId() returns zero, the contract might not have been properly initialized during deployment.");
  console.log("   This could cause 'proof_generation_failed' errors.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

