#!/usr/bin/env bash
set -euo pipefail

docker exec -i docker-db-1 psql -U replyops_app -d postgres <<'SQL'
ALTER ROLE replyops_app NOCREATEDB;
SQL

/root/replyops-production-verify-db.sh
