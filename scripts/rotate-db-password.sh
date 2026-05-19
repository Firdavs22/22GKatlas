#!/bin/bash
# Rotate Postgres password for the existing GloboAtlas database.
#
# Use case: production server runs with the seeded password and you want to swap it
# for a fresh strong one WITHOUT recreating the volume / losing data.
#
# Что делает:
#   1. Читает текущие DB_USER / DB_PASSWORD из .env
#   2. Генерирует новый пароль (openssl rand -hex 32)
#   3. Меняет пароль в Postgres через ALTER USER
#   4. Подменяет DB_PASSWORD в .env (старый бэкап в .env.bak)
#   5. Перезапускает backend, чтобы он подцепил новые credentials
#
# Запуск: ./scripts/rotate-db-password.sh
set -euo pipefail

ENV_FILE="${ENV_FILE:-.env}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-globoatlas}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Не найден $ENV_FILE — запустите из корня проекта."
  exit 1
fi

# Подгрузить текущие значения
OLD_USER=$(grep -E '^DB_USER=' "$ENV_FILE" | head -1 | cut -d= -f2-)
OLD_PASS=$(grep -E '^DB_PASSWORD=' "$ENV_FILE" | head -1 | cut -d= -f2-)
DB_NAME=${DB_NAME:-globoatlas}

if [ -z "$OLD_USER" ] || [ -z "$OLD_PASS" ]; then
  echo "DB_USER или DB_PASSWORD не найдены в $ENV_FILE"
  exit 1
fi

NEW_PASS=$(openssl rand -hex 32)
echo "Новый пароль сгенерирован (длина: ${#NEW_PASS} символов)."

echo "Меняю пароль в Postgres..."
docker exec -e PGPASSWORD="$OLD_PASS" "${COMPOSE_PROJECT}-postgres-1" \
  psql -U "$OLD_USER" -d "$DB_NAME" -c "ALTER USER \"$OLD_USER\" WITH PASSWORD '$NEW_PASS';" >/dev/null

# Бэкап старого .env
cp "$ENV_FILE" "$ENV_FILE.bak.$(date +%Y%m%d-%H%M%S)"

# Заменить строку DB_PASSWORD в .env
# Используем @ как разделитель (хеш не содержит @), безопаснее чем /
ESCAPED_PASS=$(printf '%s\n' "$NEW_PASS" | sed 's/[\/&]/\\&/g')
sed -i.tmp "s/^DB_PASSWORD=.*/DB_PASSWORD=$ESCAPED_PASS/" "$ENV_FILE"
rm -f "${ENV_FILE}.tmp"

echo "Обновил $ENV_FILE (бэкап в $ENV_FILE.bak.*)"
echo "Перезапускаю backend, чтобы подцепить новые credentials..."
docker compose up -d --no-deps backend

echo
echo "✅ Готово."
echo "Проверка: docker compose logs --tail 20 backend"
