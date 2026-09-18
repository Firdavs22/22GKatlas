#!/usr/bin/env bash
set -euo pipefail

task_project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$task_project_dir"

docker compose -f docker-compose.yml -f docker-compose.prod.yml config --quiet
docker compose --progress quiet -f docker-compose.yml -f docker-compose.prod.yml \
  run --rm -T --no-deps \
  -v "$task_project_dir/backend/prisma/create-demo-child.cjs:/app/prisma/create-demo-child.cjs:ro" \
  backend node prisma/create-demo-child.cjs </dev/null
