import hre from "hardhat";
import { ethers } from "ethers";
import * as fs from "fs";

async function main() {
  console.log("🚀 Deploying ChainVote to Polygon Amoy Testnet...");

  // Connect to network
  const provider = new ethers.JsonRpcProvider(process.env.AMOY_RPC_URL);
  const wallet   = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider);

  console.log("Deploying with wallet:", wallet.address);

  const balance = await provider.getBalance(wallet.address);
  console.log("Wallet balance:", ethers.formatEther(balance), "MATIC");

  if (balance === 0n) {
    console.log("❌ No MATIC — get free test MATIC first");
    console.log("   Go to: https://faucet.polygon.technology");
    process.exit(1);
  }

  // Load compiled contract
  const artifact = JSON.parse(
    fs.readFileSync("./artifacts/contracts/ChainVote.sol/ChainVote.json", "utf8")
  );

  const factory  = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  console.log("Deploying contract...");

  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();

  console.log("✅ ChainVote deployed successfully!");
  console.log("📜 Contract address:", address);
  console.log("");
  console.log("🔍 View on explorer:");
  console.log("   https://amoy.polygonscan.com/address/" + address);
  console.log("");
  console.log("📋 Copy this into your .env file:");
  console.log("   CONTRACT_ADDRESS=" + address);
}

main().catch((err) => {
  console.error("❌ Deployment failed:", err.message);
  process.exit(1);
});