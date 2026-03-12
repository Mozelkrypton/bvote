import { Router } from "express";
import { ethers } from "ethers";
import jwt from "jsonwebtoken";
import { readContract } from "../services/blockchain.js";
import dotenv from "dotenv";
dotenv.config();

const router = Router();

// POST /api/auth/login
// Body: { wallet, signature, message }
router.post("/login", async (req, res) => {
  try {
    const { wallet, signature, message } = req.body;

    if (!wallet || !signature || !message) {
      return res.status(400).json({ 
        error: "wallet, signature and message are required" 
      });
    }

    // Verify signature came from this wallet
    const recovered = ethers.verifyMessage(message, signature);
    if (recovered.toLowerCase() !== wallet.toLowerCase()) {
      return res.status(401).json({ error: "Signature verification failed" });
    }

    // Determine role
    let role = 1; // Default: Voter
    const superAdmin = await readContract.superAdmin();

    if (wallet.toLowerCase() === superAdmin.toLowerCase()) {
      role = 4; // SuperAdmin
    } else if (await readContract.isAdmin(wallet)) {
      role = 3; // Admin
    }

    // Check if voter is registered and approved
    const voter = await readContract.voters(wallet);
    if (!voter.exists && role === 1) {
      role = 0; // Guest — not registered yet
    }

    // Issue JWT
    const token = jwt.sign(
      { wallet, role },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      success: true,
      data: {
        token,
        wallet,
        role,
        expiresIn: "8h"
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/verify
router.get("/verify", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No token" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ success: true, data: decoded });
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

export default router;