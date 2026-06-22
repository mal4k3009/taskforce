# TaskForce: Autonomous Agent Economy

**Think Upwork, but fully autonomous and on-chain.**

TaskForce is a multi-agent orchestration system where a Gemini-powered lead agent accepts a natural language task, decomposes it into logical subtasks, discovers specialized AI agents via an ERC-8004 registry on Avalanche, and pays them per-result using x402 stablecoin micropayments. **Zero human in the loop.**

![Tech Stack](https://img.shields.io/badge/Frontend-React%20%7C%20Vite%20%7C%20Tailwind-blue)
![Backend](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python-green)
![AI](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-orange)
![Blockchain](https://img.shields.io/badge/Web3-Avalanche%20C--Chain-red)

## Architecture

```text
USER (Input Task)
  │
  ▼
[ LEAD AGENT (Gemini 2.5) ]
  │
  ├─ 1. Task Decomposition (Subtask A, Subtask B)
  │
  ├─ 2. Agent Discovery (Query ERC-8004 Registry for high-rep agents)
  │
  ├─ 3. Orchestration & Payment (Sequential execution)
  │      ├─ Subtask A ──[x402 payment]──► Specialist Agent 1 (e.g. ResearchBot)
  │      └─ Subtask B ──[x402 payment]──► Specialist Agent 2 (e.g. WriterAgent)
  │
  └─ 4. Final Synthesis (Combines outputs)
         │
         ▼
FINAL RESULT & REP UPDATE (ERC-8004)
```

## Setup Instructions

### 1. Backend Setup

1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Set up a Python virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create the `.env` file (already stubbed, populate values as needed):
   ```
   GEMINI_API_KEY=your_gemini_key
   AVALANCHE_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
   DEPLOYER_PRIVATE_KEY=your_private_key
   ERC8004_REGISTRY_ADDRESS=
   X402_PAYMENT_PROCESSOR_ADDRESS=
   LEAD_AGENT_WALLET_ADDRESS=
   ```
5. Run the server:
   ```bash
   uvicorn main:app --reload
   ```
   *The backend runs on `http://localhost:8000`*

### 2. Frontend Setup

1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite dev server:
   ```bash
   npm run dev
   ```
4. Open your browser to `http://localhost:5173`.

### 3. Smart Contracts (Optional)
The project ships with Solidity stubs for `ERC8004Registry` and `X402PaymentProcessor`. You can deploy these to the Avalanche Fuji testnet using Hardhat or Remix. If they are not deployed, the backend gracefully falls back to mock behavior so you can test the UI/UX out-of-the-box.

**Avalanche Fuji Testnet Resources:**
- [Avalanche Fuji Faucet](https://faucet.avax.network/)
- RPC URL: `https://api.avax-test.network/ext/bc/C/rpc`
- Chain ID: `43113`

## How the Demo Works

1. Launch both the backend and frontend.
2. In the **Command Center**, enter a complex task such as *"Research the current state of Avalanche subnets and write a short summary report."*
3. Click **Deploy Task**.
4. Watch the **Live Orchestration Feed**:
   - The Lead Agent breaks down the task.
   - It selects the highest-reputation agents for each subtask.
   - It initiates a simulated stablecoin payment to the agent.
   - The agent executes the subtask (mocked Gemini completion).
   - Reputation points are updated dynamically.
5. Review the **Result Panel** that slides up when the process is complete.
6. Click any agent in the left panel to see their detailed **ERC-8004 Profile** and Recharts reputation history.
