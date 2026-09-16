#!/usr/bin/env bash
# Run on the VPS after git pull. Does not reset data or run demo seeds.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

dcp() {
  docker compose -f docker-compose.yml -f docker-compose.prod.yml "$@"
}

dcp config --quiet
# Build sequentially for VPS instances with 2 GB RAM. Running containers stay up.
dcp build backend
dcp build web

umask 077
release_backup="/opt/globoatlas-backups/update-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$release_backup"
cp .env "$release_backup/env"

printf 'Сборка завершена. Сохраняю базу перед обновлением.\n'
# Stop writers so the snapshot and migrations use a consistent application state.
dcp stop backend web
trap 'printf "Обновление остановилось. Не сбрасывайте базу. Резервная копия: %s\n" "$release_backup" >&2' ERR
dcp exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' </dev/null > "$release_backup/database.dump"
test -s "$release_backup/database.dump"
dcp exec -T postgres pg_restore --list < "$release_backup/database.dump" >/dev/null
dcp run --rm -T --no-deps backend npx --no-install prisma migrate deploy </dev/null
dcp up -d --wait --wait-timeout 240 backend web
# Refresh upstream addresses after the application containers have been recreated.
dcp up -d --force-recreate --no-deps --wait --wait-timeout 120 nginx
trap - ERR
dcp ps
printf 'Обновление завершено. Копия базы и .env: %s\n' "$release_backup"
