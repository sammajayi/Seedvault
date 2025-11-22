import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import "@nomicfoundation/hardhat-ethers";
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  paths: {
    tests: {
      mocha: "./test",
      nodejs: "./test", // Also support node:test if needed
    },
  },
  mocha: {
    timeout: 40000,
  },
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
  },
});
