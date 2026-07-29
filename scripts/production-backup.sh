#!/usr/bin/env bash
set -euo pipefail

TS="$(date -u +%Y%m%dT%H%M%SZ)"
B="/root/backups/replyops-${TS}"
mkdir -p "$B"
chmod 700 "$B"

cd /var/www/replyops/current
set -a
# shellcheck disable=SC1091
. /var/www/replyops/shared/.env
set +a

pg_dump -Fc "$DATABASE_URL" -f "$B/replyops_app.dump"
pg_restore -l "$B/replyops_app.dump" >/dev/null

readlink -f /var/www/replyops/current > "$B/current_release.txt"
cp /var/www/replyops/shared/.env "$B/replyops.shared.env"
chmod 600 "$B/replyops.shared.env"

cp /etc/nginx/sites-available/replyops.abud.fun.conf "$B/replyops.nginx.conf" 2>/dev/null \
  || cp /etc/nginx/sites-enabled/replyops.abud.fun.conf "$B/replyops.nginx.conf" 2>/dev/null \
  || true

pm2 jlist > "$B/pm2-jlist.json"
cp /opt/n8n/docker-compose.yml "$B/n8n-docker-compose.yml"
cp /opt/n8n/.env "$B/n8n.env"
chmod 600 "$B/n8n.env"

if docker exec n8n-n8n-1 n8n export:workflow --id=dd8c2ce97a1f3a8d --output=/tmp/replyops-v3.json >/dev/null 2>&1; then
  docker cp n8n-n8n-1:/tmp/replyops-v3.json "$B/n8n-v3-workflow.json" >/dev/null
fi

if docker exec n8n-n8n-1 n8n export:workflow --id=replyops-dashboard-backed-v4 --output=/tmp/replyops-v4.json >/dev/null 2>&1; then
  docker cp n8n-n8n-1:/tmp/replyops-v4.json "$B/n8n-v4-workflow.json" >/dev/null
fi

node - "$B" <<'NODE'
const fs = require("fs");
const path = require("path");

const backupDir = process.argv[2];
const envPath = "/var/www/replyops/shared/.env";
const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
const vars = {};

for (const line of lines) {
  const match = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (!match) continue;
  vars[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
}

const tokenName = Object.keys(vars).find((key) => /TELEGRAM/i.test(key) && /TOKEN/i.test(key));

async function main() {
  if (!tokenName || !vars[tokenName]) {
    fs.writeFileSync(
      path.join(backupDir, "telegram-webhook.json"),
      JSON.stringify({ available: false, reason: "token_missing" }, null, 2),
    );
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${vars[tokenName]}/getWebhookInfo`);
    const json = await response.json();
    fs.writeFileSync(path.join(backupDir, "telegram-webhook.json"), JSON.stringify(json, null, 2));
  } catch {
    fs.writeFileSync(
      path.join(backupDir, "telegram-webhook.json"),
      JSON.stringify({ available: false, reason: "request_failed" }, null, 2),
    );
  }
}

main();
NODE

psql "$DATABASE_URL" -At > "$B/channel-configurations-redacted.json" <<'SQL'
SELECT COALESCE(jsonb_pretty(jsonb_agg(jsonb_build_object(
  'id', c.id,
  'tenantId', c."tenantId",
  'type', c.type,
  'connectionId', c."connectionId",
  'status', c.status,
  'displayName', c."displayName",
  'externalAccountId', c."externalAccountId",
  'lastVerifiedTime', c."lastVerifiedTime",
  'lastError', c."lastError",
  'enabled', c.enabled,
  'credentialStored', cc.id IS NOT NULL,
  'credentialVersion', cc."credentialVersion",
  'createdAt', c."createdAt",
  'updatedAt', c."updatedAt",
  'deletedAt', c."deletedAt"
) ORDER BY c."updatedAt" DESC)), '[]'::jsonb::text)
FROM "ChannelConnection" c
LEFT JOIN "ChannelCredential" cc ON cc."channelConnectionId" = c.id;
SQL

printf '%s\n' "$B"
