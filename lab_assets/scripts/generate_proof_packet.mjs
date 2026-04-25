import fs from "node:fs"
import path from "node:path"
import { Contract, JsonRpcProvider, ZeroAddress, isAddress } from "ethers"
import { Group } from "@semaphore-protocol/group"
import { Identity } from "@semaphore-protocol/identity"
import { generateProof } from "@semaphore-protocol/proof"

const DEFAULT_SEMAPHORE_ADDRESS = "0x8A1fd199516489B0Fb7153EB5f075cDAC83c693D"
const DEFAULT_SEPOLIA_SEMAPHORE_START_BLOCK = 9118042

const TRADE_DESK_ABI = [
  "function groupId() view returns (uint256)",
  "function tradeScope() view returns (uint256)",
  "function semaphore() view returns (address)",
  "event MemberAdded(uint256 indexed identityCommitment)"
]

function parseArgs(argv) {
  const args = {
    identity: process.env.IDENTITY_FILE ?? "semaphore_identity.json",
    out: process.env.PROOF_PACKET_PATH ?? "proof_packet.generated.json",
    rpc: process.env.RPC_URL,
    tradeDesk: process.env.TRADE_DESK_ADDRESS,
    recipient: process.env.RECIPIENT_ADDRESS,
    semaphore: process.env.SEMAPHORE_ADDRESS ?? DEFAULT_SEMAPHORE_ADDRESS,
    startBlock: process.env.SEMAPHORE_START_BLOCK ?? String(DEFAULT_SEPOLIA_SEMAPHORE_START_BLOCK),
    blockRange: process.env.LOG_BLOCK_RANGE ?? "49999",
    force: false
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]

    if (arg === "--identity") {
      args.identity = argv[++i]
    } else if (arg === "--out") {
      args.out = argv[++i]
    } else if (arg === "--rpc") {
      args.rpc = argv[++i]
    } else if (arg === "--trade-desk") {
      args.tradeDesk = argv[++i]
    } else if (arg === "--recipient") {
      args.recipient = argv[++i]
    } else if (arg === "--semaphore") {
      args.semaphore = argv[++i]
    } else if (arg === "--start-block") {
      args.startBlock = argv[++i]
    } else if (arg === "--block-range") {
      args.blockRange = argv[++i]
    } else if (arg === "--force") {
      args.force = true
    } else if (arg === "--help" || arg === "-h") {
      args.help = true
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  return args
}

function printHelp() {
  console.log(`Usage:
  node scripts/generate_proof_packet.mjs --rpc <sepolia_rpc_url> --trade-desk <trade_desk_address> --recipient <recipient_wallet_address>

Optional:
  --identity semaphore_identity.json
  --out proof_packet.generated.json
  --semaphore ${DEFAULT_SEMAPHORE_ADDRESS}
  --start-block ${DEFAULT_SEPOLIA_SEMAPHORE_START_BLOCK}
  --block-range 49999
  --force

Environment variables with the same meaning are also supported:
  RPC_URL, TRADE_DESK_ADDRESS, RECIPIENT_ADDRESS, IDENTITY_FILE, PROOF_PACKET_PATH, SEMAPHORE_ADDRESS, SEMAPHORE_START_BLOCK, LOG_BLOCK_RANGE`)
}

function requireValue(value, name) {
  if (!value) {
    throw new Error(`Missing ${name}. Pass it as an argument or environment variable.`)
  }

  return value
}

function normalizeAddress(value, name) {
  const address = requireValue(value, name)

  if (!isAddress(address)) {
    throw new Error(`${name} is not a valid Ethereum address: ${address}`)
  }

  return address
}

const args = parseArgs(process.argv.slice(2))

if (args.help) {
  printHelp()
  process.exit(0)
}

const rpcUrl = requireValue(args.rpc, "RPC_URL")
const tradeDeskAddress = normalizeAddress(args.tradeDesk, "TRADE_DESK_ADDRESS")
const recipientAddress = normalizeAddress(args.recipient, "RECIPIENT_ADDRESS")
const semaphoreAddress = normalizeAddress(args.semaphore, "SEMAPHORE_ADDRESS")
const startBlock = Number(requireValue(args.startBlock, "SEMAPHORE_START_BLOCK"))
const blockRange = Number(requireValue(args.blockRange, "LOG_BLOCK_RANGE"))
const identityPath = path.resolve(process.cwd(), args.identity)
const outputPath = path.resolve(process.cwd(), args.out)

if (!Number.isSafeInteger(startBlock) || startBlock < 0) {
  throw new Error(`SEMAPHORE_START_BLOCK must be a non-negative integer: ${args.startBlock}`)
}

if (!Number.isSafeInteger(blockRange) || blockRange <= 0) {
  throw new Error(`LOG_BLOCK_RANGE must be a positive integer: ${args.blockRange}`)
}

if (!fs.existsSync(identityPath)) {
  throw new Error(`Identity file not found: ${identityPath}. Run scripts/generate_identity.mjs first.`)
}

if (fs.existsSync(outputPath) && !args.force) {
  const existing = JSON.parse(fs.readFileSync(outputPath, "utf8"))
  const looksLikeTemplate =
    existing.merkleTreeDepth === 0 &&
    existing.merkleTreeRoot === 0 &&
    existing.nullifier === 0 &&
    existing.message === 0 &&
    existing.scope === 0

  if (!looksLikeTemplate) {
    throw new Error(`Output file already has non-template values: ${outputPath}. Use --force to replace it.`)
  }
}

const identityRecord = JSON.parse(fs.readFileSync(identityPath, "utf8"))
const identity = Identity.import(requireValue(identityRecord.privateKey, "identity privateKey"))
const identityCommitment = identity.commitment.toString()

const provider = new JsonRpcProvider(rpcUrl)
const tradeDesk = new Contract(tradeDeskAddress, TRADE_DESK_ABI, provider)
const semaphoreAbi = [
  "function getGroupAdmin(uint256 groupId) view returns (address)",
  "function getMerkleTreeSize(uint256 groupId) view returns (uint256)",
  "function getMerkleTreeRoot(uint256 groupId) view returns (uint256)"
]
const semaphoreContract = new Contract(semaphoreAddress, semaphoreAbi, provider)

async function queryEventsInChunks(contract, eventName, filterArgs, fromBlock, chunkSize) {
  const latestBlock = await provider.getBlockNumber()
  const events = []

  for (let from = fromBlock; from <= latestBlock; from += chunkSize + 1) {
    const to = Math.min(from + chunkSize, latestBlock)
    const filter = contract.filters[eventName](...filterArgs)
    const chunk = await contract.queryFilter(filter, from, to)
    events.push(...chunk)
  }

  return events
}

async function getTradeDeskGroupMembers(groupId, fromBlock, chunkSize) {
  const groupAdmin = await semaphoreContract.getGroupAdmin(groupId)

  if (groupAdmin === ZeroAddress) {
    throw new Error(`Group '${groupId}' not found`)
  }

  const memberAddedEvents = await queryEventsInChunks(tradeDesk, "MemberAdded", [], fromBlock, chunkSize)
  const members = memberAddedEvents.map((event) => event.args.identityCommitment.toString())
  const onchainSize = Number(await semaphoreContract.getMerkleTreeSize(groupId))

  if (members.length !== onchainSize) {
    throw new Error(
      `TradeDesk emitted ${members.length} MemberAdded event(s), but Semaphore group ${groupId} has size ${onchainSize}.\n` +
        "Try rerunning with an earlier --start-block."
    )
  }

  return members
}

console.log("Reading TradeDesk group and scope...")
const [groupIdValue, tradeScopeValue, onchainSemaphoreAddress] = await Promise.all([
  tradeDesk.groupId(),
  tradeDesk.tradeScope(),
  tradeDesk.semaphore()
])

if (onchainSemaphoreAddress.toLowerCase() !== semaphoreAddress.toLowerCase()) {
  throw new Error(
    `SEMAPHORE_ADDRESS mismatch. TradeDesk uses ${onchainSemaphoreAddress}, but script was given ${semaphoreAddress}.`
  )
}

const groupId = groupIdValue.toString()
const scope = tradeScopeValue.toString()

console.log(`TradeDesk: ${tradeDeskAddress}`)
console.log(`Semaphore: ${semaphoreAddress}`)
console.log(`groupId: ${groupId}`)
console.log(`scope: ${scope}`)
console.log("")
console.log(`Fetching TradeDesk MemberAdded events in ${blockRange}-block chunks...`)

const members = await getTradeDeskGroupMembers(groupId, startBlock, blockRange)

if (!members.includes(identityCommitment)) {
  throw new Error(
    `This identityCommitment is not yet in group ${groupId}.\n` +
      `Call TradeDesk.addMember(${identityCommitment}) first, wait for the transaction to be mined, then rerun this script.`
  )
}

const group = new Group(members.map((member) => BigInt(member)))
const onchainRoot = await semaphoreContract.getMerkleTreeRoot(groupId)

if (group.root.toString() !== onchainRoot.toString()) {
  throw new Error(
    `Reconstructed group root ${group.root.toString()} does not match on-chain root ${onchainRoot.toString()}.\n` +
      "Do not use this proof packet until the group reconstruction issue is fixed."
  )
}

const message = BigInt(recipientAddress).toString()

console.log(`Group size: ${group.size}`)
console.log(`Recipient/message: ${recipientAddress} / ${message}`)
console.log("")
console.log("Generating zero-knowledge membership proof. This may take a little while...")

const proof = await generateProof(identity, group, message, scope)
const packet = {
  _comment:
    "Generated Semaphore proof packet for ClassroomAnonymousTradeDesk.anonymousTrade(recipient, proof). The nullifier is single-use for this scope.",
  merkleTreeDepth: proof.merkleTreeDepth,
  merkleTreeRoot: proof.merkleTreeRoot.toString(),
  nullifier: proof.nullifier.toString(),
  message: proof.message.toString(),
  scope: proof.scope.toString(),
  points: proof.points.map((point) => point.toString())
}

fs.writeFileSync(outputPath, `${JSON.stringify(packet, null, 2)}\n`)

console.log(`Wrote proof packet to: ${outputPath}`)
console.log("")
console.log("Use this file as proof_packet_path in the notebook.")
