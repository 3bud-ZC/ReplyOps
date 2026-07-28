#!/usr/bin/env bash
set -euo pipefail

cd /var/www/replyops/current
set -a
# shellcheck disable=SC1091
. /var/www/replyops/shared/.env
set +a

psql "$DATABASE_URL" -tAc "delete from \"RateLimitBucket\" where identifier like 'login:%:abudfun@gmail.com%';"
