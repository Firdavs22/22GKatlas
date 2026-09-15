#!/usr/bin/env bash
set -euo pipefail

task_project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$task_project_dir"

# Python reads from the terminal; only JSON goes into the container's stdin.
# The password is neither a command argument nor a saved environment variable.
python3 -c '
import getpass, json, sys
if not sys.stdin.isatty():
    sys.exit("Запустите эту команду в интерактивном SSH-терминале.")
print("Email главного администратора: ", end="", file=sys.stderr, flush=True)
email = sys.stdin.readline().strip()
print("Имя: ", end="", file=sys.stderr, flush=True)
name = sys.stdin.readline().strip()
password = getpass.getpass("Пароль (минимум 12 символов): ")
confirmation = getpass.getpass("Повторите пароль: ")
if password != confirmation:
    sys.exit("Пароли не совпадают. Пользователь не создан.")
print(json.dumps({"email": email, "name": name, "password": password}))
' | docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  run --rm -T --no-deps backend node prisma/create-admin.cjs
