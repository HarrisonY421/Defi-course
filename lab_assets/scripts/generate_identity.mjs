import fs from "node:fs"
import path from "node:path"
import { Identity } from "@semaphore-protocol/identity"

function parseArgs(argv) {
  const args = {
    out: "semaphore_identity.json",
    force: false
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]

    if (arg === "--out") {
      args.out = argv[++i]
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
  node scripts/generate_identity.mjs [--out semaphore_identity.json] [--force]

Creates a local Semaphore identity and prints the identityCommitment.
Use the printed identityCommitment as the input to TradeDesk.addMember(...).
Keep the generated privateKey private.`)
}

const args = parseArgs(process.argv.slice(2))

if (args.help) {
  printHelp()
  process.exit(0)
}

const outputPath = path.resolve(process.cwd(), args.out)

if (fs.existsSync(outputPath) && !args.force) {
  const existing = JSON.parse(fs.readFileSync(outputPath, "utf8"))
  console.log(`Identity file already exists: ${outputPath}`)
  console.log("Use --force if you really want to replace it.")
  console.log("")
  console.log("identityCommitment for addMember(identityCommitment):")
  console.log(existing.identityCommitment ?? existing.commitment)
  process.exit(0)
}

const identity = new Identity()
const record = {
  schema: "semaphore-identity-v1",
  createdAt: new Date().toISOString(),
  warning: "Demo identity for the classroom lab. Keep privateKey private; do not commit it to GitHub.",
  privateKey: identity.export(),
  identityCommitment: identity.commitment.toString()
}

fs.writeFileSync(outputPath, `${JSON.stringify(record, null, 2)}\n`)

console.log(`Wrote Semaphore identity to: ${outputPath}`)
console.log("")
console.log("identityCommitment for addMember(identityCommitment):")
console.log(record.identityCommitment)
