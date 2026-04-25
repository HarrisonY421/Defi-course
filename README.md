# Lab: Zero-Knowledge Anonymous Trading

Open and run:

```text
Lab_v3_Zero_Knowledge_Proof_and_Anonymous_Trading.ipynb
```

The notebook uses files in this same folder:

- `abis.json`
- `proof_packet.generated.json` generated locally before the anonymous trade section

## Setup

Install Python requirements for the notebook:

```powershell
pip install -r requirements.txt
```

Install Node dependencies for Semaphore proof generation:

```powershell
npm install
```

## Generate A Semaphore Identity

Run this from the current folder:

```powershell
npm run identity
```

Copy the printed `identityCommitment` and add it to the deployed `ClassroomAnonymousTradeDesk` contract:

```text
addMember(identityCommitment)
```

Do not commit `semaphore_identity.json`.

## Generate A Proof Packet

After `addMember(...)` is confirmed on Sepolia, run:

```powershell
$env:RPC_URL="YOUR_SEPOLIA_RPC_URL"
$env:TRADE_DESK_ADDRESS="YOUR_TRADE_DESK_ADDRESS"
$env:RECIPIENT_ADDRESS="YOUR_RECIPIENT_ADDRESS"
npm run proof
```

This writes:

```text
proof_packet.generated.json
```

The notebook default is:

```python
proof_packet_path = "proof_packet.generated.json"
```

`RECIPIENT_ADDRESS` must match the `recipient_address` used in the notebook. If you change the recipient, generate a new proof packet.

## Course Token Addresses

This lab reuses the course Sepolia tokens:

```text
USTUSD: 0xc83B0efA5B3F13851DfA11de72EF6AFeF026730c
USTETH: 0x4E22e9951770b98d4f3B2BA6647f0f40A15A4057
USTFaucet: 0x4Cd26B8a999582727789E8236789125D8a9022c5
```

Only deploy `contracts/ClassroomAnonymousTradeDesk.sol` if a fresh TradeDesk is needed.
