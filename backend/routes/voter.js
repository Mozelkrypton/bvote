import { Router } from "express";
import { ethers } from "ethers";
import { contract, readContract } from "../services/blockchain.js";
import { requireRole } from "../middleware/auth.js";
import crypto from "crypto";

const router = Router();

// POST /api/voter/register — self registration
router.post("/register", async (req, res) => {
  try {
    const { fullName, nationalId, district } = req.body;

    if (!fullName || !nationalId) {
      return res.status(400).json({ error: "fullName and nationalId required" });
    }

    // Hash national ID before storing — never store raw ID on chain
    const idHash = crypto.createHash("sha256").update(nationalId).digest("hex");

    const tx = await contract.registerVoter(fullName, idHash, district || "");
    await tx.wait();

    res.json({
      success: true,
      data: {
        message: "Registration submitted — awaiting admin approval",
        txHash:  tx.hash
      }
    });
  } catch (err) {
    if (err.message.includes("Already registered")) {
      return res.status(409).json({ error: "This wallet is already registered" });
    }
    res.status(500).json({ error: err.message });
  }
});

// GET /api/voter/status/:wallet — check voter status
router.get("/status/:wallet", async (req, res) => {
  try {
    const voter = await readContract.voters(req.params.wallet);

    if (!voter.exists) {
      return res.status(404).json({ error: "Voter not found" });
    }

    res.json({
      success: true,
      data: {
        wallet:       voter.wallet,
        fullName:     voter.fullName,
        district:     voter.district,
        status:       Number(voter.status),
        statusText:   ["Unregistered","Pending","Approved","Rejected","Suspended"][Number(voter.status)],
        registeredAt: Number(voter.registeredAt)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/voter/elections — open elections with hasVoted flag
router.get("/elections", requireRole(1), async (req, res) => {
  try {
    const ids  = await readContract.getAllElectionIds();
    const list = await Promise.all(ids.map(id => readContract.elections(id)));

    const withVoted = await Promise.all(
      list.map(async e => {
        const hasVoted = await readContract.checkHasVoted(e.id, req.user.wallet);
        return {
          id:               Number(e.id),
          name:             e.name,
          description:      e.description,
          startTime:        Number(e.startTime),
          endTime:          Number(e.endTime),
          status:           Number(e.status),
          totalVotes:       Number(e.totalVotes),
          resultsPublished: e.resultsPublished,
          hasVoted
        };
      })
    );

    res.json({
      success: true,
      data: withVoted.filter(e => e.status === 1) // Open only
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/voter/vote — cast a vote
router.post("/vote", requireRole(1), async (req, res) => {
  try {
    const { electionId, candidateId } = req.body;

    if (!electionId || !candidateId) {
      return res.status(400).json({ error: "electionId and candidateId required" });
    }

    // Check already voted before sending transaction
    const alreadyVoted = await readContract.checkHasVoted(
      electionId,
      req.user.wallet
    );
    if (alreadyVoted) {
      return res.status(409).json({ error: "You have already voted in this election" });
    }

    // Random nonce for vote receipt anonymity
    const nonce = ethers.randomBytes(32);
    const tx    = await contract.castVote(electionId, candidateId, nonce);
    const receipt = await tx.wait();

    res.json({
      success: true,
      data: {
        message:     "✅ Vote cast successfully",
        txHash:      tx.hash,
        blockNumber: receipt.blockNumber,
        network:     "Polygon Amoy Testnet",
        explorer:    `https://amoy.polygonscan.com/tx/${tx.hash}`
      }
    });
  } catch (err) {
    if (err.message.includes("Already voted")) {
      return res.status(409).json({ error: "Already voted in this election" });
    }
    if (err.message.includes("Not approved")) {
      return res.status(403).json({ error: "Your voter registration is not approved yet" });
    }
    res.status(500).json({ error: err.message });
  }
});

// GET /api/voter/receipt/:electionId — get vote receipt
router.get("/receipt/:electionId", requireRole(1), async (req, res) => {
  try {
    const receipt = await readContract.getReceipt(
      req.params.electionId,
      req.user.wallet
    );

    if (receipt === "0x0000000000000000000000000000000000000000000000000000000000000000") {
      return res.status(404).json({ error: "No vote found for this election" });
    }

    res.json({
      success: true,
      data: {
        wallet:     req.user.wallet,
        electionId: req.params.electionId,
        receipt,
        message:    "This hash proves your vote was recorded on-chain"
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

