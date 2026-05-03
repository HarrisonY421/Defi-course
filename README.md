# DeFi Course – Zero-Knowledge Proof & Anonymous Trading Lab

A hands-on laboratory module introducing Zero-Knowledge Proofs (ZKP) and their application in anonymous DeFi trading, built on the Ethereum Sepolia testnet using the Semaphore protocol.


## Overview

This lab teaches students how to:

- Understand the mathematical foundations of Zero-Knowledge Proofs
- Generate a Semaphore identity and join an on-chain group
- Create a ZK proof of group membership without revealing identity
- Execute an anonymous token trade on a smart contract using that proof


## Repository Structure

```
Defi-course/
├── Lab_Zero_Knowledge_Proof_and_Anonymous_Trading.ipynb   # Main lab notebook
├── lab_assets/
│   ├── abis.json                        # Contract ABIs
│   ├── contracts/
│   │   └── ClassroomAnonymousTradeDesk.sol  # Solidity contract (deploy if needed)
│   ├── requirements.txt                 # Python dependencies
│   ├── package.json                     # Node.js dependencies
│   ├── semaphore_identity.json          # Generated locally — DO NOT commit
│   └── proof_packet.generated.json      # Generated locally before anonymous trade
└── .gitignore
```


## Key Concepts

### Zero-Knowledge Proof System

A ZK proof system consists of two core algorithms:

```
π ← Prove(pk, x, w)          // Prover generates a proof
Verify(vk, x, π) ∈ {0, 1}   // Verifier checks the proof
```

Where:
- `x` – public input (visible on-chain)
- `w` – private witness (never revealed)
- `π` – the proof submitted on-chain

### Three Fundamental Properties

| Property | Description |
|---|---|
| **Completeness** | Honest provers with valid witnesses always pass verification |
| **Soundness** | Cheating provers succeed with negligible probability ε |
| **Zero-Knowledge** | The verifier learns nothing beyond the truth of the statement |

### Nullifiers

Nullifiers prevent double-spending while preserving anonymity:

```
nullifier = H(identity_secret, scope)
```

Same identity + same scope → same nullifier (reuse detected)  
Same identity + different scope → different nullifier

---

## Setup

### Prerequisites

- Python 3.8+
- Node.js 16+
- A funded Ethereum Sepolia wallet
- A Sepolia RPC endpoint (e.g., Infura)

### Install Python dependencies

```powershell
pip install -r lab_assets/requirements.txt
```

### Install Node.js dependencies

```powershell
cd lab_assets
npm install
```

---

## Lab Walkthrough

### Step 1 — Generate a Semaphore Identity

```powershell
cd lab_assets
npm run identity
```

Copy the printed `identityCommitment` and register it with the deployed contract:

```solidity
addMember(identityCommitment)
```

> ⚠️ **Never commit** `lab_assets/semaphore_identity.json` to version control.

### Step 2 — Generate a Proof Packet

After `addMember(...)` is confirmed on Sepolia:

```powershell
cd lab_assets
$env:RPC_URL="YOUR_SEPOLIA_RPC_URL"
$env:TRADE_DESK_ADDRESS="THE_SAME_ADDRESS_AS_trade_desk_address_IN_THE_NOTEBOOK"
$env:RECIPIENT_ADDRESS="YOUR_RECIPIENT_ADDRESS"
npm run proof
```

This writes `lab_assets/proof_packet.generated.json`.

> ⚠️ `RECIPIENT_ADDRESS` must match the `recipient_address` used in the notebook. If you change the recipient, regenerate the proof packet.

### Step 3 — Run the Notebook

Open and execute:

```
Lab_Zero_Knowledge_Proof_and_Anonymous_Trading.ipynb
```

Fill in the configuration cell at the top:

```python
rpc_url = "https://sepolia.infura.io/v3/YOUR_KEY"
wallet_public_address = "0x..."
wallet_private_key = "..."       # Never commit a real key
recipient_address = "0x..."      # Must match proof packet
```

---

## Course Token Addresses (Sepolia)

| Token | Address |
|---|---|
| USTUSD | `0xc83B0efA5B3F13851DfA11de72EF6AFeF026730c` |
| USTETH | `0x4E22e9951770b98d4f3B2BA6647f0f40A15A4057` |
| USTFaucet | `0x4Cd26B8a999582727789E8236789125D8a9022c5` |
| ClassroomAnonymousTradeDesk | `0xc4D89B20B53Ce26b7Ab9A2F3BFBd1c16d5456B08` |

Only deploy `lab_assets/contracts/ClassroomAnonymousTradeDesk.sol` if a fresh TradeDesk is needed.

---

## What This Lab Does and Does NOT Hide

This lab demonstrates **anonymous authorization** — the contract verifies a proof instead of identifying the trader wallet.

| Item | Visibility |
|---|---|
| Trader identity | 🔒 Hidden (ZK proof) |
| Trade size | 👁 Public |
| Desk inventory | 👁 Public |
| Recipient address | 👁 Public |
| Transaction timing | 👁 Public |

---

## ZK Applications in Web3

- **Scaling** — ZK rollups prove correct execution of many off-chain transactions
- **Private identity** — Prove membership, age, or eligibility without revealing personal data
- **Private payments** — Reduce linkability between sender, receiver, and history
- **Governance & voting** — Vote anonymously while proving eligibility
- **Credentials & games** — Prove ownership or progress without exposing all account data

---

## Security Notes

- **Never** commit private keys or `semaphore_identity.json`
- **Never** reuse a proof packet with a different recipient address
- This contract is for educational purposes on Sepolia testnet only

---

## License

For educational use only as part of the DeFi Course curriculum.
