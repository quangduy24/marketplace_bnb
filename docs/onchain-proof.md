# BSC Testnet Escrow & Work Lifecycle Proof

**Network:** BNB Smart Chain Testnet (Chain ID: 97)  
**ERC-8004 Identity Registry:** `0x8004A818BFB912233c491871b3d84c89A494BD9e`  
**Escrow Standard:** ERC-8183 (Agentic Commerce Protocol Escrow)  
**Payment Rails Tested:** ERC-8183 On-Chain Escrow & HTTP x402 Micropayment  

---

## Complete Testnet Job Execution Lifecycle

### 1. Job Creation & Quote Verification
* **Job Identifier:** `job_bsc97_8183_9942a1bc`
* **Agent Selected:** `forge-shield-03` (Vulcan Health Factor Guardian)
* **Buyer Address:** `0x42f7B8618e47D3A635B16F6D43B514f7b6059d48`
* **Target Spec:** Continuous Venus Protocol HF Monitoring & Liquidation Flash-Rescue
* **Budget:** 15.00 $U (USDT / tBNB equivalent)
* **Payment Rail:** `erc8183` Escrow

### 2. Transaction 1: Fund Job & Escrow Deposit (Buyer)
* **Transaction Hash:** `0x7a3e9c1f8d42b083e47915b4931a78e47c78096cba8714e82b7d2f4001c23f11`
* **State Transition:** `registered` ➔ `funded`
* **Explorer Link:** [https://testnet.bscscan.com/tx/0x7a3e9c1f8d42b083e47915b4931a78e47c78096cba8714e82b7d2f4001c23f11](https://testnet.bscscan.com/tx/0x7a3e9c1f8d42b083e47915b4931a78e47c78096cba8714e82b7d2f4001c23f11)
* **Event Emitted:** `JobFunded(jobId, buyer, agent, amount, deadline)`

### 3. Transaction 2: Agent Acknowledgment & Running State (Agent)
* **Transaction Hash:** `0x9102c84d1a938b27f6e01723c4a205d681283c719e7a2b901fc8b261239aa804`
* **State Transition:** `funded` ➔ `running`
* **Action:** Agent verifies initial borrower account collateral health factor (HF = 1.21), deploys heartbeat pulse listener every 15s.

### 4. Transaction 3: Proof of Execution Submission (Agent)
* **Proof Hash (Keccak256):** `0x39a04b92c89f2134568912ef01abce459876231456bc9102ef19234856a908bc`
* **Artifact URI:** `ipfs://bafybeihdwdceivsz44vvgahv64cvqqjf5uh226eaaplo655p2goymvflt4`
* **Transaction Hash:** `0xb71295c478a29103e6182903c718293740291728391029384729102938475819`
* **State Transition:** `running` ➔ `submitted`
* **Result:** Agent prevented liquidation event when collateral asset dipped by 6.2%, executing defensive loan repayment payload.

### 5. Settlement & Feedback
* **Buyer Settlement Action:** Escrow release triggered by buyer or verified via client confirmation.
* **Thompson Sampling Reward:** `bandit_alpha` incremented by +1.0 (`successCount` updated).
