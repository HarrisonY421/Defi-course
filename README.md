# Lab: Zero-Knowledge Anonymous Trading

Open and run:

```text
Lab_Zero_Knowledge_Proof_and_Anonymous_Trading.ipynb
```

The notebook stays in the repository root. Supporting files are in:

```text
lab_assets/
```

The notebook reads:

- `lab_assets/abis.json`
- `lab_assets/proof_packet.generated.json`, generated locally before the anonymous trade section

## Setup

Install Python requirements for the notebook:

```powershell
pip install -r lab_assets/requirements.txt
```

Install Node dependencies for Semaphore proof generation:

```powershell
cd lab_assets
npm install
```

## Generate A Semaphore Identity

Run this from `lab_assets`:

```powershell
npm run identity
```

Copy the printed `identityCommitment` and add it to the deployed `ClassroomAnonymousTradeDesk` contract:

```text
addMember(identityCommitment)
```

Do not commit `lab_assets/semaphore_identity.json`.

## Generate A Proof Packet

After `addMember(...)` is confirmed on Sepolia, run:

```powershell
cd lab_assets
$env:RPC_URL="YOUR_SEPOLIA_RPC_URL"
$env:TRADE_DESK_ADDRESS="THE_SAME_ADDRESS_AS_trade_desk_address_IN_THE_NOTEBOOK"
$env:RECIPIENT_ADDRESS="YOUR_RECIPIENT_ADDRESS"
npm run proof
```

This writes:

```text
lab_assets/proof_packet.generated.json
```

The notebook default is:

```python
proof_packet_path = lab_assets_dir / "proof_packet.generated.json"
```

`RECIPIENT_ADDRESS` must match the `recipient_address` used in the notebook. If you change the recipient, generate a new proof packet.

## Course Token Addresses

This lab reuses the course Sepolia tokens:

```text
USTUSD: 0xc83B0efA5B3F13851DfA11de72EF6AFeF026730c
USTETH: 0x4E22e9951770b98d4f3B2BA6647f0f40A15A4057
USTFaucet: 0x4Cd26B8a999582727789E8236789125D8a9022c5
```

Only deploy `lab_assets/contracts/ClassroomAnonymousTradeDesk.sol` if a fresh TradeDesk is needed.
