#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

python3 - <<'PY'
import datetime, ipaddress, os, pathlib, re, shutil, tempfile

env_path = pathlib.Path('.env')
if not env_path.is_file():
    raise SystemExit('Файл .env не найден. Запустите скрипт в проекте на VPS.')
print('Нужен внешний IP подключения сада, не адрес VPS. Для нескольких адресов используйте запятую.')
with open('/dev/tty', 'r+') as terminal:
    terminal.write('Внешний IP сада: ')
    terminal.flush()
    raw = terminal.readline().strip()
addresses = [value.strip() for value in raw.split(',') if value.strip()]
if not addresses or len(addresses) > 20:
    raise SystemExit('Укажите от 1 до 20 адресов. Настройки не изменены.')
normalized = []
try:
    for value in addresses:
        address = ipaddress.ip_address(value)
        if not address.is_global:
            raise ValueError('Нужен публичный внешний IP, а не локальный адрес Wi-Fi.')
        normalized.append(str(address))
except ValueError:
    raise SystemExit('Нужны отдельные публичные IPv4/IPv6 адреса (без маски подсети). Настройки не изменены.')

values = {'TEAM_CLOCK_ENABLED': 'true', 'TEAM_WORKPLACE_CIDRS': ','.join(dict.fromkeys(normalized))}
original = env_path.read_text()
updated = original
for key, value in values.items():
    pattern = re.compile(r'^' + key + r'=.*$', re.MULTILINE)
    if pattern.search(updated):
        updated = pattern.sub(key + '=' + value, updated)
    else:
        updated = updated.rstrip('\n') + '\n' + key + '=' + value + '\n'

os.umask(0o077)
backup = pathlib.Path('/opt/globoatlas-backups') / ('clock-' + datetime.datetime.now().strftime('%Y%m%d-%H%M%S-%f'))
backup.mkdir(parents=True, mode=0o700)
shutil.copyfile(env_path, backup / 'env')
os.chmod(backup / 'env', 0o600)
with tempfile.NamedTemporaryFile('w', dir=env_path.resolve().parent, prefix='.clock-env-', delete=False) as target:
    target.write(updated)
    temporary = target.name
os.chmod(temporary, 0o600)
os.replace(temporary, env_path)
print('Учет включен. Копия прежнего .env:', backup / 'env')
PY

docker compose -f docker-compose.yml -f docker-compose.prod.yml config --quiet
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps --force-recreate --wait --wait-timeout 180 backend
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps --force-recreate --wait --wait-timeout 120 nginx
printf 'Готово. Откройте «Мой табель», подключившись к рабочему Wi-Fi сада.\n'
