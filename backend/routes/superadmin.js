import { Router } from "express";
import { contract, readContract } from "../services/blockchain.js";
import { requireRole } from "../middleware/auth.js";

const router = Router();
router.use(requireRole(4)); // SuperAdmin only

// POST /api/superadmin/grant-admin
router.post("/grant-admin", async (req, res) => {
  try {
    const { wallet } = req.body;
    if (!wallet) {
      return res.status(400).json({ error: "wallet required" });
    }
    const tx = await contract.grantAdmin(wallet);
    await tx.wait();
    res.json({
      success: true,
      data: { message: "Admin role granted", wallet, txHash: tx.hash }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/superadmin/revoke-admin
router.post("/revoke-admin", async (req, res) => {
  try {
    const { wallet } = req.body;
    if (!wallet) {
      return res.status(400).json({ error: "wallet required" });
    }
    const tx = await contract.revokeAdmin(wallet);
    await tx.wait();
    res.json({
      success: true,
      data: { message: "Admin role revoked", wallet, txHash: tx.hash }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/superadmin/admins — list all admins
router.get("/admins", async (req, res) => {
  try {
    const admins = await readContract.adminList();
    res.json({
      success: true,
      data: { admins }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;