import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"

const PASSWORD_VARIABLES = ["REPLYOPS_OWNER_BOOTSTRAP_PASSWORD", "REPLYOPS_OWNER_CURRENT_PASSWORD"]
const repoRoot = path.resolve(process.cwd(), "..")
const localSecretsPath = path.join(repoRoot, "SECRETS.local.env")

function readVariables() {
  const text = fs.readFileSync(localSecretsPath, "utf8")
  const values = {}
  for (const variable of PASSWORD_VARIABLES) {
    const match = text.match(new RegExp(`^${variable}=(.*)$`, "m"))
    if (match?.[1]) values[variable] = match[1].trim()
  }
  if (!values.REPLYOPS_OWNER_BOOTSTRAP_PASSWORD) {
    throw new Error("REPLYOPS_OWNER_BOOTSTRAP_PASSWORD missing")
  }
  return values
}

const secretValues = readVariables()
const remoteScript = `
const fs = require("fs");
const path = "/var/www/replyops/shared/.env";
let payload = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => payload += chunk);
process.stdin.on("end", () => {
  const values = JSON.parse(payload).values;
  let text = fs.existsSync(path) ? fs.readFileSync(path, "utf8") : "";
  for (const [key, value] of Object.entries(values)) {
    const line = key + "=" + value;
    const pattern = new RegExp("^" + key + "=.*$", "m");
    text = pattern.test(text) ? text.replace(pattern, line) : text + (text.endsWith("\\n") || text.length === 0 ? "" : "\\n") + line + "\\n";
  }
  fs.writeFileSync(path, text, { mode: 0o600 });
  fs.chmodSync(path, 0o600);
});
`
const encodedRemoteScript = Buffer.from(remoteScript, "utf8").toString("base64")
const remoteCommand = `node -e "$(printf '%s' '${encodedRemoteScript}' | base64 -d)"`

const result = spawnSync(
  "ssh",
  ["root@167.99.157.6", remoteCommand],
  {
    input: JSON.stringify({ values: secretValues }),
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  },
)

if (result.status !== 0) {
  process.stderr.write(result.stderr || "sync failed\n")
  process.exit(result.status ?? 1)
}

process.stdout.write("owner_secret_sync_ok\n")
