#!/bin/bash
# Nightly backup of Postgres + MinIO volume.
# Run from cron (см. SETUP_PROD.md §7).
set -euo pipefail

BACKUP_DIR=${BACKUP_DIR:-/backup}
KEEP_DAYS=${KEEP_DAYS:-30}
COMPOSE_PROJECT=${COMPOSE_PROJECT:-globoatlas}
DB_USER=${DB_USER:-globoatlas}
DB_NAME=${DB_NAME:-globoatlas}
DATE=$(date +%Y-%m-%d-%H%M)

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Backup start"

# ── Postgres ──
docker exec "${COMPOSE_PROJECT}-postgres-1" pg_dump -U "$DB_USER" "$DB_NAME" \
  | gzip > "$BACKUP_DIR/db-$DATE.sql.gz"
echo "  Postgres → db-$DATE.sql.gz ($(du -h "$BACKUP_DIR/db-$DATE.sql.gz" | cut -f1))"

# ── Object storage volume (SeaweedFS) ──
docker run --rm \
  -v "${COMPOSE_PROJECT}_storagedata:/data:ro" \
  -v "$BACKUP_DIR:/backup" \
  alpine tar czf "/backup/storage-$DATE.tar.gz" -C /data .
echo "  Storage → storage-$DATE.tar.gz ($(du -h "$BACKUP_DIR/storage-$DATE.tar.gz" | cut -f1))"

# ── Retention ──
DELETED_DB=$(find "$BACKUP_DIR" -maxdepth 1 -name 'db-*.sql.gz' -mtime +$KEEP_DAYS -delete -print | wc -l)
DELETED_ST=$(find "$BACKUP_DIR" -maxdepth 1 -name 'storage-*.tar.gz' -mtime +$KEEP_DAYS -delete -print | wc -l)
if [ "$DELETED_DB" -gt 0 ] || [ "$DELETED_ST" -gt 0 ]; then
  echo "  Cleaned ${DELETED_DB} old DB + ${DELETED_ST} old storage backups (>${KEEP_DAYS} days)"
fi

echo "[$(date)] Backup done"
