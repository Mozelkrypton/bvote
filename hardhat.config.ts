//hardhat.config.ts
import { HardhatUserConfig } from "hardhat/config";
import dotenv from "dotenv";
dotenv.config();

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    amoy: {
      type: "http",
      url: process.env.AMOY_RPC_URL || "https://rpc-amoy.polygon.technology",
      chainId: 80002,
      ...(PRIVATE_KEY ? { accounts: [PRIVATE_KEY] } : {})
    }
  }
};

export default config;