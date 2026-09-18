#!/usr/bin/env bash
set -euo pipefail

task_project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$task_project_dir"

# The helper is mounted read-only, so adding this command does not require a
# rebuild or restart of the running portal. Existing accounts are never updated.
docker compose -f docker-compose.yml -f docker-compose.prod.yml config --quiet

python3 -c '
import getpass, json, sys

if not sys.stdin.isatty():
    sys.exit("Запустите команду отдельно в интерактивном SSH-терминале.")

roles = [
    ("teacher", "Педагог"),
    ("parent", "Родитель"),
    ("psychologist", "Психолог"),
    ("pediatrician", "Педиатр"),
    ("methodist", "Методист"),
    ("sales_manager", "Менеджер продаж"),
    ("admin", "Администратор"),
    ("director", "Директор"),
]

def ask(prompt):
    print(prompt, end="", file=sys.stderr, flush=True)
    value = sys.stdin.readline()
    if not value:
        sys.exit("Ввод завершен. Аккаунт не создан.")
    return value.strip()

try:
    print("Создание обычного аккаунта без письма. Права соответствуют выбранной роли.", file=sys.stderr)
    for index, (_, label) in enumerate(roles, 1):
        print(f"{index}) {label}", file=sys.stderr)
    choice = ask("Номер роли: ")
    if choice not in [str(i) for i in range(1, len(roles) + 1)]:
        sys.exit("Неверный номер роли. Аккаунт не создан.")
    role, label = roles[int(choice) - 1]
    email = ask("Email для входа: ")
    name = ask(f"Имя [Тест — {label}]: ") or f"Тест — {label}"
    password = getpass.getpass("Пароль (минимум 8 символов): ")
    confirmation = getpass.getpass("Повторите пароль: ")
    if password != confirmation:
        sys.exit("Пароли не совпадают. Аккаунт не создан.")
    print(json.dumps({"email": email, "name": name, "role": role, "password": password}))
except (KeyboardInterrupt, EOFError):
    sys.exit("\nСоздание отменено.")
' | docker compose --progress quiet -f docker-compose.yml -f docker-compose.prod.yml \
  run --rm -T --no-deps \
  -v "$task_project_dir/backend/prisma/create-role-account.cjs:/app/prisma/create-role-account.cjs:ro" \
  backend node prisma/create-role-account.cjs
