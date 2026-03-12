import { Router } from "express";
import { contract, readContract } from "../services/blockchain.js";
import { requireRole } from "../middleware/auth.js";
import crypto from "crypto";

const router = Router();
router.use(requireRole(3)); // All routes here need Admin or SuperAdmin

// GET /api/admin/voters — all voters
router.get("/voters", async (req, res) => {
  try {
    const addresses = await readContract.getAllVoterAddresses();
    const voters    = await Promise.all(
      addresses.map(addr => readContract.voters(addr))
    );
    res.json({
      success: true,
      data: voters.map(v => ({
        wallet:       v.wallet,
        fullName:     v.fullName,
        district:     v.district,
        status:       Number(v.status),
        statusText:   ["Unregistered","Pending","Approved","Rejected","Suspended"][Number(v.status)],
        registeredAt: Number(v.registeredAt)
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/voter/approve — approve, reject or suspend a voter
router.post("/voter/approve", async (req, res) => {
  try {
    const { wallet, status } = req.body;
    // status: 2=Approved 3=Rejected 4=Suspended

    if (!wallet || status === undefined) {
      return res.status(400).json({ error: "wallet and status required" });
    }

    const tx = await contract.setVoterStatus(wallet, status);
    await tx.wait();

    const statusText = ["Unregistered","Pending","Approved","Rejected","Suspended"][status];

    res.json({
      success: true,
      data: {
        message: `Voter ${statusText} successfully`,
        wallet,
        txHash: tx.hash
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/voter/bulk — bulk register up to 2000 voters
router.post("/voter/bulk", async (req, res) => {
  try {
    const { voters } = req.body;

    if (!voters || !Array.isArray(voters)) {
      return res.status(400).json({ error: "voters array required" });
    }

    const results = [];

    for (const voter of voters) {
      try {
        const idHash = crypto.createHash("sha256")
          .update(voter.nationalId)
          .digest("hex");

        const tx = await contract.adminRegisterVoter(
          voter.wallet,
          voter.fullName,
          idHash,
          voter.district || ""
        );
        await tx.wait();

        results.push({
          wallet:  voter.wallet,
          name:    voter.fullName,
          success: true,
          txHash:  tx.hash
        });
      } catch (err) {
        results.push({
          wallet:  voter.wallet,
          name:    voter.fullName,
          success: false,
          error:   err.message
        });
      }
    }

    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.json({
      success: true,
      data: {
        message: `Bulk registration complete: ${passed} success, ${failed} failed`,
        results
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/candidate/add — add a candidate
router.post("/candidate/add", async (req, res) => {
  try {
    const { fullName, party, position } = req.body;

    if (!fullName || !party || !position) {
      return res.status(400).json({ error: "fullName, party and position required" });
    }

    const tx = await contract.addCandidate(fullName, party, position);
    await tx.wait();

    res.json({
      success: true,
      data: {
        message: "Candidate added successfully",
        txHash:  tx.hash
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/candidates — all candidates
router.get("/candidates", async (req, res) => {
  try {
    const ids  = await readContract.getAllCandidateIds();
    const list = await Promise.all(ids.map(id => readContract.candidates(id)));

    res.json({
      success: true,
      data: list.map(c => ({
        id:           Number(c.id),
        fullName:     c.fullName,
        party:        c.party,
        position:     c.position,
        status:       Number(c.status),
        statusText:   ["Pending","Approved","Disqualified"][Number(c.status)],
        registeredAt: Number(c.registeredAt)
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/election/create — create election
router.post("/election/create", async (req, res) => {
  try {
    const { name, description, startTime, endTime, candidateIds } = req.body;

    if (!name || !startTime || !endTime || !candidateIds?.length) {
      return res.status(400).json({
        error: "name, startTime, endTime and candidateIds required"
      });
    }

    const tx = await contract.createElection(
      name,
      description || "",
      startTime,
      endTime,
      candidateIds
    );
    await tx.wait();

    res.json({
      success: true,
      data: {
        message: "Election created successfully",
        txHash:  tx.hash
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/election/:id/status — open, close or cancel
router.patch("/election/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    // 0=Pending 1=Open 2=Closed 3=Cancelled

    if (status === undefined) {
      return res.status(400).json({ error: "status required" });
    }

    const tx = await contract.setElectionStatus(req.params.id, status);
    await tx.wait();

    const statusText = ["Pending","Open","Closed","Cancelled"][status];

    res.json({
      success: true,
      data: {
        message: `Election ${statusText} successfully`,
        txHash:  tx.hash
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/election/:id/publish — publish results
router.post("/election/:id/publish", async (req, res) => {
  try {
    const tx = await contract.publishResults(req.params.id);
    await tx.wait();

    res.json({
      success: true,
      data: {
        message: "Results published successfully",
        txHash:  tx.hash
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/election/:id/results — live tally
router.get("/election/:id/results", async (req, res) => {
  try {
    const candIds = await readContract.getElectionCandidates(req.params.id);
    const results = await Promise.all(
      candIds.map(async id => {
        const cand  = await readContract.candidates(id);
        const votes = await readContract.getVoteCount(req.params.id, id);
        return {
          candidateId: Number(id),
          fullName:    cand.fullName,
          party:       cand.party,
          votes:       Number(votes)
        };
      })
    );

    const elec = await readContract.elections(req.params.id);

    res.json({
      success: true,
      data: {
        electionId: Number(elec.id),
        name:       elec.name,
        status:     Number(elec.status),
        totalVotes: Number(elec.totalVotes),
        results:    results.sort((a, b) => b.votes - a.votes)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;