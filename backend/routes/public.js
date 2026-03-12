import { Router } from "express";
import { readContract } from "../services/blockchain.js";

const router = Router();

// GET /api/public/info
router.get("/info", async (req, res) => {
  try {
    const info = await readContract.getInfo();
    res.json({
      success: true,
      data: {
        superAdmin:      info[0],
        deployedAt:      Number(info[1]),
        totalVoters:     Number(info[2]),
        totalElections:  Number(info[3]),
        totalCandidates: Number(info[4]),
        network:         "Polygon Amoy Testnet"
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/public/elections
router.get("/elections", async (req, res) => {
  try {
    const ids  = await readContract.getAllElectionIds();
    const list = await Promise.all(ids.map(id => readContract.elections(id)));
    res.json({
      success: true,
      data: list.map(e => ({
        id:               Number(e.id),
        name:             e.name,
        description:      e.description,
        startTime:        Number(e.startTime),
        endTime:          Number(e.endTime),
        status:           Number(e.status),
        totalVotes:       Number(e.totalVotes),
        resultsPublished: e.resultsPublished
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/public/candidates
router.get("/candidates", async (req, res) => {
  try {
    const ids  = await readContract.getAllCandidateIds();
    const list = await Promise.all(ids.map(id => readContract.candidates(id)));
    res.json({
      success: true,
      data: list
        .filter(c => Number(c.status) === 1)
        .map(c => ({
          id:       Number(c.id),
          fullName: c.fullName,
          party:    c.party,
          position: c.position
        }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/public/results/:electionId
router.get("/results/:electionId", async (req, res) => {
  try {
    const elec = await readContract.elections(req.params.electionId);
    if (!elec.exists) {
      return res.status(404).json({ error: "Election not found" });
    }
    if (!elec.resultsPublished) {
      return res.status(403).json({ error: "Results not yet published" });
    }
    const candIds = await readContract.getElectionCandidates(req.params.electionId);
    const results = await Promise.all(
      candIds.map(async id => {
        const cand  = await readContract.candidates(id);
        const votes = await readContract.getVoteCount(req.params.electionId, id);
        return {
          candidateId: Number(id),
          fullName:    cand.fullName,
          party:       cand.party,
          votes:       Number(votes)
        };
      })
    );
    res.json({
      success: true,
      data: {
        electionId:  Number(elec.id),
        name:        elec.name,
        totalVotes:  Number(elec.totalVotes),
        results:     results.sort((a, b) => b.votes - a.votes)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;