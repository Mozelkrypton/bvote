import { ethers } from "ethers";
import { readFileSync } from "fs";
import dotenv from "dotenv";
dotenv.config();

// Load compiled contract ABI
const artifact = JSON.parse(
  readFileSync("./ChainVote.json", "utf8")
);

// Connect to Polygon Amoy
const provider = new ethers.JsonRpcProvider(process.env.AMOY_RPC_URL);
const signer   = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

// contract     → read + write (admin actions, voting)
// readContract → read only (fetching data)
const contract     = new ethers.Contract(process.env.CONTRACT_ADDRESS, artifact.abi, signer);
const readContract = new ethers.Contract(process.env.CONTRACT_ADDRESS, artifact.abi, provider);

console.log("✅ Blockchain service connected");
console.log("📜 Contract:", process.env.CONTRACT_ADDRESS);

export { contract, readContract, provider, signer, ethers };