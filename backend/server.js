import express       from "express";
import cors          from "cors";
import helmet        from "helmet";
import dotenv        from "dotenv";
dotenv.config();

import publicRoutes     from "./routes/public.js";
import authRoutes       from "./routes/auth.js";
import voterRoutes      from "./routes/voter.js";
import adminRoutes      from "./routes/admin.js";
import superadminRoutes from "./routes/superadmin.js";

const app = express();

// ── Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// ── Routes
app.use("/api/public",     publicRoutes);
app.use("/api/auth",       authRoutes);
app.use("/api/voter",      voterRoutes);
app.use("/api/admin",      adminRoutes);
app.use("/api/superadmin", superadminRoutes);

// ── Health check
app.get("/health", (req, res) => {
  res.json({
    status:    "ok",
    project:   "BVote",
    contract:  process.env.CONTRACT_ADDRESS,
    network:   "Polygon Amoy Testnet",
    timestamp: new Date().toISOString()
  });
});

// ── 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Error handler
app.use((err, req, res, next) => {
  console.error("❌ Server error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// ── Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log("╔══════════════════════════════════════╗");
  console.log("║         BVOTE BACKEND RUNNING        ║");
  console.log("╚══════════════════════════════════════╝");
  console.log(`✅ Server:   http://localhost:${PORT}`);
  console.log(`🔗 Health:   http://localhost:${PORT}/health`);
  console.log(`📜 Contract: ${process.env.CONTRACT_ADDRESS}`);
  console.log(`🌐 Network:  Polygon Amoy Testnet`);
});