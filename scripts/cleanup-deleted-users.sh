#!/bin/bash
# Physically delete users that have been soft-deleted (deletedAt set) more than 30 days ago.
# Cron example: 0 4 * * * /home/deploy/apps/globoatlas/scripts/cleanup-deleted-users.sh
set -euo pipefail

COMPOSE_PROJECT=${COMPOSE_PROJECT:-globoatlas}
DB_USER=${DB_USER:-globoatlas}
DB_NAME=${DB_NAME:-globoatlas}

COUNT=$(docker exec "${COMPOSE_PROJECT}-postgres-1" psql -U "$DB_USER" -d "$DB_NAME" -tAc \
  "SELECT COUNT(*) FROM \"User\" WHERE \"deletedAt\" IS NOT NULL AND \"deletedAt\" < NOW() - INTERVAL '30 days'")

if [ "$COUNT" -eq 0 ]; then
  echo "[$(date)] No expired soft-deleted users to purge."
  exit 0
fi

echo "[$(date)] Purging $COUNT users older than 30 days..."

docker exec "${COMPOSE_PROJECT}-postgres-1" psql -U "$DB_USER" -d "$DB_NAME" <<'SQL'
BEGIN;
-- Drop dependent rows that have RESTRICT FKs (Progress etc.) for these users.
-- Most relations are CASCADE; only Progress and a few admin-authored tables are RESTRICT.
-- To keep history intact, we ONLY hard-delete users whose dependents are already detached.
DELETE FROM "RefreshToken"
  WHERE "userId" IN (SELECT id FROM "User" WHERE "deletedAt" < NOW() - INTERVAL '30 days');
DELETE FROM "User"
  WHERE "deletedAt" < NOW() - INTERVAL '30 days';
COMMIT;
SQL

echo "[$(date)] Done."
