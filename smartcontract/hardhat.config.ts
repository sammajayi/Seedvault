import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import "@nomicfoundation/hardhat-ethers";
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  paths: {
    tests: {
      mocha: "./test",
      // node:test is disabled by pointing to non-existent directory
      // Use 'npm test' to run Mocha tests directly
      nodejs: "./test/.nodejs-disabled",
    },
  },
  mocha: {
    timeout: 40000,
    spec: ["test/**/*.test.ts"],
    ignore: ["test/**/*.node.test.ts", "test/**/test-vault-on-fork.js"],
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
    celoSepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("CELO_SEPOLIA_RPC_URL") || "https://alfajores-forno.celo-testnet.org",
      accounts: [configVariable("CELO_SEPOLIA_PRIVATE_KEY")],
      chainId: 44787,
    },
  },
});
