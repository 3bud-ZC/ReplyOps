#!/usr/bin/env bash
set -euo pipefail

TS="${1:?release timestamp required}"
ARCHIVE="/tmp/replyops-release-${TS}.tar"
REL="/var/www/replyops/releases/${TS}"
PRECHECK_LOG="/tmp/replyops-precheck-${TS}.log"
PRECHECK_PID="/tmp/replyops-precheck-${TS}.pid"

mkdir -p "$REL"
tar -xf "$ARCHIVE" -C "$REL"
cd "$REL"

ln -sfn /var/www/replyops/shared/.env .env
ln -sfn /var/www/replyops/shared/uploads uploads

npm ci
npx prisma generate
npx prisma migrate deploy --config prisma.production.config.ts
npx prisma migrate status --config prisma.production.config.ts
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run build

nohup npx next start -p 3112 -H 127.0.0.1 > "$PRECHECK_LOG" 2>&1 &
echo $! > "$PRECHECK_PID"

for _ in $(seq 1 30); do
  code="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3112/login || true)"
  if [ "$code" = "200" ]; then
    echo "precheck_login=200"
    break
  fi
  sleep 2
done

code="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3112/login || true)"
if [ "$code" != "200" ]; then
  echo "precheck_login=$code"
  tail -80 "$PRECHECK_LOG" || true
  kill "$(cat "$PRECHECK_PID")" 2>/dev/null || true
  exit 1
fi

kill "$(cat "$PRECHECK_PID")" 2>/dev/null || true
ln -sfnT "$REL" /var/www/replyops/current
pm2 restart replyops --update-env
pm2 save
rm -f "$ARCHIVE"

echo "active_release=$REL"
