#!/bin/bash
# Rotate Postgres user name (and password) for the existing GloboAtlas database.
#
# Use case: вы хотите уйти от дефолтного DB_USER=globoatlas на нестандартное имя
# (security through obscurity + меньше шансов на конфликт с auto-scanning).
#
# Что делает:
#   1. Создаёт новую роль с новым именем и сильным паролем
#   2. Передаёт OWNER базы новой роли
#   3. Обновляет .env (старый — в .bak)
#   4. Перезапускает backend
#   5. Удаляет старого пользователя
#
# Использование:
#   NEW_DB_USER=globoatlas_prod ./scripts/rotate-db-user.sh
set -euo pipefail

ENV_FILE="${ENV_FILE:-.env}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-globoatlas}"
NEW_USER="${NEW_DB_USER:-}"
DB_NAME="${DB_NAME:-globoatlas}"

if [ -z "$NEW_USER" ]; then
  echo "Укажите новое имя: NEW_DB_USER=имя ./scripts/rotate-db-user.sh"
  exit 1
fi
if [[ ! "$NEW_USER" =~ ^[a-z_][a-z0-9_]{2,40}$ ]]; then
  echo "Имя должно быть lowercase / digits / _, длина 3-40."
  exit 1
fi

OLD_USER=$(grep -E '^DB_USER=' "$ENV_FILE" | head -1 | cut -d= -f2-)
OLD_PASS=$(grep -E '^DB_PASSWORD=' "$ENV_FILE" | head -1 | cut -d= -f2-)
NEW_PASS=$(openssl rand -hex 32)

if [ "$OLD_USER" = "$NEW_USER" ]; then
  echo "Имя уже совпадает с .env — используйте rotate-db-password.sh для смены только пароля."
  exit 1
fi

echo "Старый: $OLD_USER → Новый: $NEW_USER"
echo "Создаю нового пользователя и передаю OWNER базы..."

docker exec -e PGPASSWORD="$OLD_PASS" "${COMPOSE_PROJECT}-postgres-1" \
  psql -U "$OLD_USER" -d "$DB_NAME" <<SQL
-- Создать роль (CREATEDB не нужен — мы только владелец БД)
CREATE ROLE "$NEW_USER" WITH LOGIN PASSWORD '$NEW_PASS';
-- Передать владение базой
ALTER DATABASE "$DB_NAME" OWNER TO "$NEW_USER";
-- Передать владение всеми таблицами в схеме public
DO \$\$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('ALTER TABLE public.%I OWNER TO %I', r.tablename, '$NEW_USER');
  END LOOP;
  FOR r IN SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema='public' LOOP
    EXECUTE format('ALTER SEQUENCE public.%I OWNER TO %I', r.sequence_name, '$NEW_USER');
  END LOOP;
  FOR r IN SELECT t.typname FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typtype='e' LOOP
    EXECUTE format('ALTER TYPE public.%I OWNER TO %I', r.typname, '$NEW_USER');
  END LOOP;
END\$\$;
GRANT ALL PRIVILEGES ON DATABASE "$DB_NAME" TO "$NEW_USER";
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "$NEW_USER";
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "$NEW_USER";
SQL

# Бэкап .env
cp "$ENV_FILE" "$ENV_FILE.bak.$(date +%Y%m%d-%H%M%S)"

# Заменить DB_USER и DB_PASSWORD
ESCAPED_PASS=$(printf '%s\n' "$NEW_PASS" | sed 's/[\/&]/\\&/g')
sed -i.tmp "s/^DB_USER=.*/DB_USER=$NEW_USER/" "$ENV_FILE"
sed -i.tmp "s/^DB_PASSWORD=.*/DB_PASSWORD=$ESCAPED_PASS/" "$ENV_FILE"
rm -f "${ENV_FILE}.tmp"

echo "Перезапускаю backend..."
docker compose up -d --no-deps backend
sleep 5

# Удалить старого пользователя (от лица нового)
echo "Удаляю старого пользователя $OLD_USER..."
docker exec -e PGPASSWORD="$NEW_PASS" "${COMPOSE_PROJECT}-postgres-1" \
  psql -U "$NEW_USER" -d "$DB_NAME" -c "DROP USER \"$OLD_USER\";" || \
  echo "⚠ Не удалось удалить старого пользователя — возможно, он ещё держит соединения. Удалите вручную позже."

echo
echo "✅ Готово."
echo "DB_USER теперь: $NEW_USER"
echo "Старый .env: $ENV_FILE.bak.*"
