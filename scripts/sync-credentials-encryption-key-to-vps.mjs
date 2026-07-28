import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"

const VARIABLE = "REPLYOPS_CREDENTIALS_ENCRYPTION_KEY"
const localSecretsPath = path.join(path.resolve(process.cwd(), ".."), "SECRETS.local.env")

const text = fs.readFileSync(localSecretsPath, "utf8")
const value = text.match(new RegExp(`^${VARIABLE}=(.*)$`, "m"))?.[1]?.trim()
if (!value) throw new Error(`${VARIABLE} missing`)

const remoteScript = `
const fs = require("fs");
const path = "/var/www/replyops/shared/.env";
const key = "${VARIABLE}";
let payload = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => payload += chunk);
process.stdin.on("end", () => {
  const value = JSON.parse(payload).value;
  let text = fs.existsSync(path) ? fs.readFileSync(path, "utf8") : "";
  const line = key + "=" + value;
  const pattern = new RegExp("^" + key + "=.*$", "m");
  text = pattern.test(text) ? text.replace(pattern, line) : text + (text.endsWith("\\n") || text.length === 0 ? "" : "\\n") + line + "\\n";
  fs.writeFileSync(path, text, { mode: 0o600 });
  fs.chmodSync(path, 0o600);
});
`

const encodedRemoteScript = Buffer.from(remoteScript, "utf8").toString("base64")
const remoteCommand = `node -e "$(printf '%s' '${encodedRemoteScript}' | base64 -d)"`
const result = spawnSync("ssh", ["root@167.99.157.6", remoteCommand], {
  input: JSON.stringify({ value }),
  encoding: "utf8",
  stdio: ["pipe", "pipe", "pipe"],
})

if (result.status !== 0) {
  process.stderr.write(result.stderr || "sync failed\n")
  process.exit(result.status ?? 1)
}

process.stdout.write("credentials_encryption_key_sync_ok\n")
