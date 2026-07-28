#!/usr/bin/env bash
set -euo pipefail

cd /var/www/replyops/current
set -a
# shellcheck disable=SC1091
. /var/www/replyops/shared/.env
set +a

psql "$DATABASE_URL" -tA <<'SQL'
SELECT 'pgvector=' || extname FROM pg_extension WHERE extname = 'vector';
SELECT 'replyops_app_createdb=' || rolcreatedb FROM pg_roles WHERE rolname = 'replyops_app';
SQL
