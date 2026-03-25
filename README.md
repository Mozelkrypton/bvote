# ⛓ BVote — Blockchain Enabled Voting System

![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636?logo=solidity)
![Polygon](https://img.shields.io/badge/Network-Polygon%20Amoy-8247E5?logo=polygon)
![Node.js](https://img.shields.io/badge/Backend-Node.js%2022-339933?logo=node.js)
![Netlify](https://img.shields.io/badge/Frontend-Netlify-00C7B7?logo=netlify)
![Railway](https://img.shields.io/badge/Backend-Railway-0B0D0E?logo=railway)
![License](https://img.shields.io/badge/License-MIT-yellow)

> A decentralized, tamper-proof blockchain voting system built on Polygon. Every vote is permanently recorded on-chain, publicly auditable, and mathematically protected from manipulation.

---

## 🌐 Live Demo

| Layer | URL |
|-------|-----|
| 🖥 Frontend | [https://bvote-voting.netlify.app](https://bvote-voting.netlify.app) |
| ⚙️ Backend API | [https://bvote-production.up.railway.app](https://bvote-production.up.railway.app) |
| ⛓ Smart Contract | [0xd6041d8eF3F653caf1cF4Ee047D6cF73bc10AcCd](https://amoy.polygonscan.com/address/0xd6041d8eF3F653caf1cF4Ee047D6cF73bc10AcCd) |

---

## 📖 About

BVote is a final year research project developed at **Zetech University** (School of ICT, Media and Engineering) for the **Bachelor of Science in Computer Science** degree.

The system addresses the transparency and integrity challenges of conventional voting systems by leveraging blockchain technology. It is designed for institutional elections (universities, colleges) as a proof of concept for eventual government-scale deployment in Kenya.

---

## ✨ Features

- 🔐 **MetaMask wallet authentication** — no passwords required
- 🗳 **On-chain vote recording** — every vote is immutable and permanent
- 🛡 **Double vote prevention** — mathematically enforced by smart contract
- 🔒 **SHA-256 ID hashing** — national IDs never stored in plain text
- 👥 **Role-based access control** — SuperAdmin, Admin, Voter, Auditor, Guest
- 📊 **Real-time results** — live vote counts from the blockchain
- 🌍 **Public auditability** — all results verifiable on Polygonscan
- 💰 **Low cost** — ~$22 total for 10,000 voters on Polygon mainnet

---

## 🏗 System Architecture

```
┌─────────────────────────────────────┐
│  TIER 1 — PRESENTATION LAYER        │
│  HTML + CSS + JS (Netlify CDN)      │
└──────────────────┬──────────────────┘
                   │ HTTP REST API + JWT
┌──────────────────▼──────────────────┐
│  TIER 2 — BUSINESS LOGIC LAYER      │
│  Node.js + Express.js (Railway)     │
└──────────────────┬──────────────────┘
                   │ ethers.js + JSON-RPC
┌──────────────────▼──────────────────┐
│  TIER 3 — DATA LAYER                │
│  ChainVote.sol (Polygon Amoy)       │
└─────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 22+
- MetaMask browser extension
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/Mozelkrypton/bvote.git
cd bvote

# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..
```

### Environment Variables

Create a `.env` file in the root directory:

```env
AMOY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR-ALCHEMY-KEY
DEPLOYER_PRIVATE_KEY=0xYOUR-PRIVATE-KEY
CONTRACT_ADDRESS=0xd6041d8eF3F653caf1cF4Ee047D6cF73bc10AcCd
JWT_SECRET=your-jwt-secret-min-64-chars
PORT=4000
```

### Run Locally

```bash
# Start backend
node backend/server.js

# Start frontend (new terminal)
cd frontend && python3 -m http.server 3000
```

Open `http://localhost:3000` in Chrome with MetaMask installed.

---

## 📁 Project Structure

```
bvote/
├── contracts/
│   └── ChainVote.sol          ← Solidity smart contract
├── scripts/
│   └── deploy.ts              ← Hardhat deploy script
├── backend/
│   ├── server.js              ← Express app entry point
│   ├── ChainVote.json         ← Contract ABI
│   ├── middleware/
│   │   └── auth.js            ← JWT authentication
│   ├── routes/
│   │   ├── public.js          ← Public endpoints
│   │   ├── auth.js            ← Login/logout
│   │   ├── voter.js           ← Voter functions
│   │   ├── admin.js           ← Admin functions
│   │   └── superadmin.js      ← SuperAdmin functions
│   └── services/
│       └── blockchain.js      ← ethers.js blockchain service
├── frontend/
│   ├── index.html             ← HTML structure
│   ├── index.css              ← Styles
│   └── index.js               ← App logic
├── hardhat.config.ts          ← Hardhat configuration
└── .env                       ← Environment variables (never commit)
```

---

## 🔑 User Roles

| Role | Level | Permissions |
|------|-------|-------------|
| Guest | 0 | View elections and results |
| Voter | 1 | Register and cast votes |
| Auditor | 2 | Read-only access to all records |
| Admin | 3 | Manage voters, elections, candidates |
| SuperAdmin | 4 | Full control + grant/revoke admin roles |

---

## 🧪 Testing

All 25 functional test cases and 8 security test cases passed.
System Usability Scale score: **78.5/100 (Good)**.

```bash
# Test backend health
curl https://bvote-production.up.railway.app/health

# Test public API
curl https://bvote-production.up.railway.app/api/public/info
```

---

## 💻 Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | Solidity 0.8.20 |
| Blockchain | Polygon Amoy Testnet |
| Contract Framework | Hardhat 3.x |
| Blockchain Library | ethers.js 6.x |
| Backend Runtime | Node.js 22 |
| Backend Framework | Express.js 4.x |
| Authentication | JSON Web Token |
| Frontend | Vanilla HTML/CSS/JS |
| Wallet | MetaMask |
| Frontend Hosting | Netlify |
| Backend Hosting | Railway |

---

## 📊 Cost Analysis (Polygon Mainnet)

| Item | Cost (USD) |
|------|-----------|
| Contract deployment | ~$2.00 |
| 10,000 voter registrations | ~$10.00 |
| 10,000 votes cast | ~$10.00 |
| Election management | ~$0.50 |
| **Total** | **~$22.50** |

---

## 🔒 Security Features

- JWT tokens with 8-hour expiry
- SHA-256 hashing of national IDs
- On-chain role verification for all privileged routes
- Helmet.js HTTP security headers
- CORS protection
- Rate limiting
- Smart contract access modifiers

---

## 📄 License

Copyright (c) 2025 Levian Amos
Zetech University — School of ICT, Media and Engineering
Licensed under the MIT License.

---

## 👨‍💻 Author

**Levian Amos**
Registration No: BCS-05-0164/2022
Zetech University — School of ICT, Media and Engineering
Bachelor of Science in Computer Science

---

## 🙏 Acknowledgements

- Zetech University Department of ICT Engineering
- Polygon Network for free testnet infrastructure
- Hardhat, ethers.js, and the Ethereum developer community