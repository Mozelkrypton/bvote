import jwt from "jsonwebtoken";
import { readContract } from "../services/blockchain.js";
import dotenv from "dotenv";
dotenv.config();

export function requireRole(minRole) {
  return async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;

      // For admin routes re-verify role directly on blockchain
      if (minRole >= 3) {
        const onChainAdmin = await readContract.isAdmin(decoded.wallet);
        const superAdmin   = await readContract.superAdmin();
        const isSuperAdmin = decoded.wallet.toLowerCase() === superAdmin.toLowerCase();

        if (!isSuperAdmin && !onChainAdmin) {
          return res.status(403).json({ error: "Not an admin on-chain" });
        }
      }

      if (decoded.role < minRole) {
        return res.status(403).json({
          error: `Need role level ${minRole}, you have ${decoded.role}`
        });
      }

      next();
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  };
}