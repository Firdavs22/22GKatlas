# Первый запуск lk.globokids.ru

Инструкция для **новой пустой базы**. При переносе старых данных сначала восстановить PostgreSQL и хранилище; команду создания первого администратора тогда не выполнять. Обычный запуск больше не создаёт тестовых пользователей и не вызывает seed.

Нужны Docker Engine, Docker Compose **2.24.4 или новее**, Git, Python 3, OpenSSL и Certbot. Установка Docker зависит от ОС: [официальная инструкция для Ubuntu](https://docs.docker.com/engine/install/ubuntu/). Порты 80 и 443 должны быть свободны и разрешены в панели VPS. DNS A поддомена должен указывать на IPv4 этого сервера. Запись AAAA нужна только при настроенном IPv6.

Образы приложения собираются на Node.js 24; отдельно устанавливать Node.js на VPS не требуется. На сервере с 2 ГБ RAM собирать backend и web последовательно, при наличии swap. Обновление зависимостей от 2026-09-15 требует пересборки обоих образов, но не меняет схему базы и созданные аккаунты.

Ниже команды в Bash под root на VPS. Рабочий каталог фиксирован: `/opt/globoatlas`. Сначала проверить ОС и свободные ресурсы:

```bash
cat /etc/os-release
free -h
df -h /
ss -lnt
docker compose version
```

## Код и настройки

```bash
git clone --branch master https://github.com/Firdavs22/22GKatlas.git /opt/globoatlas
cd /opt/globoatlas
cp .env.example .env
chmod 600 .env
openssl rand -hex 32
openssl rand -base64 48
openssl rand -hex 32
nano .env
```

Три случайных значения использовать отдельно для DB_PASSWORD, JWT_SECRET и MINIO_PASSWORD. Для новой базы и хранилища задать уникальные значения. Не менять пароль уже созданной PostgreSQL простой заменой `.env`.

В `.env` указать:

```dotenv
DB_USER=globoatlas
MINIO_USER=globoatlas-storage
CORS_ORIGINS=https://lk.globokids.ru
PUBLIC_APP_URL=https://lk.globokids.ru
NEXT_PUBLIC_API_URL=https://lk.globokids.ru
NEXT_PUBLIC_WS_URL=https://lk.globokids.ru
TEAM_ENABLED=true
LIBRARY_ENABLED=true
CRM_ENABLED=true
```

NEXT_PUBLIC_API_URL задаётся **без /api**. Для приглашений заполнить SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS и SMTP_FROM своими действующими настройками. Если SMTP_HOST пуст, письма не отправляются. CRM_WEBHOOK_TOKEN пока можно оставить пустым: ручная CRM работает, внешний приём заявок отключён. Коннектор Тильды ещё не добавлен.

Сокращение для команд в текущем SSH-сеансе:

```bash
dcp() { docker compose --project-directory /opt/globoatlas -f /opt/globoatlas/docker-compose.yml -f /opt/globoatlas/docker-compose.prod.yml "$@"; }
dcp config --quiet
dcp build backend
dcp build web
dcp up -d --wait postgres redis storage
dcp run --rm --no-deps backend npx prisma migrate deploy
bash scripts/create-first-admin.sh
```

Последняя команда запросит email, имя и пароль главного администратора. Ввод пароля скрыт. Команда работает только при отсутствии пользователей в базе, не удаляет данные и не сбрасывает существующий пароль. Тестовые семьи и учебные материалы не создаются. **Не выполнять `prisma db seed`, `migrate reset` или `docker compose down -v` на рабочей базе.**

## HTTPS

Первый временный nginx обслуживает только проверку сертификата, остальные запросы возвращают 404. Поэтому приложение не открывается без HTTPS.

```bash
mkdir -p nginx/acme nginx/ssl
dcp -f /opt/globoatlas/docker-compose.acme.yml up -d --no-deps nginx
certbot certonly --webroot -w /opt/globoatlas/nginx/acme --cert-name lk.globokids.ru -d lk.globokids.ru
install -m 600 /etc/letsencrypt/live/lk.globokids.ru/fullchain.pem nginx/ssl/fullchain.pem
install -m 600 /etc/letsencrypt/live/lk.globokids.ru/privkey.pem nginx/ssl/privkey.pem
dcp up -d --wait
dcp exec -T nginx nginx -t
dcp exec -T backend npx prisma migrate status
curl -fsS https://lk.globokids.ru/api/health
curl -I https://lk.globokids.ru/login
```

В Certbot указать свой email и подтвердить условия. Открыть `https://lk.globokids.ru/login` и войти с данными, заданными в команде создания администратора. Если команда завершилась ошибкой, сначала разобраться с ней и только затем переходить к следующей.

## Продление сертификата

После успешного запуска установить deploy-hook. Certbot использует webroot из первого выпуска, поэтому nginx не требуется останавливать. Hook копирует обновлённую пару сертификатов и перезагружает nginx.

```bash
install -d -m 755 /etc/letsencrypt/renewal-hooks/deploy
cat > /etc/letsencrypt/renewal-hooks/deploy/globoatlas.sh <<'SH'
#!/bin/sh
set -eu
[ "${RENEWED_LINEAGE:-}" = /etc/letsencrypt/live/lk.globokids.ru ] || exit 0
install -m 600 "$RENEWED_LINEAGE/fullchain.pem" /opt/globoatlas/nginx/ssl/fullchain.pem
install -m 600 "$RENEWED_LINEAGE/privkey.pem" /opt/globoatlas/nginx/ssl/privkey.pem
docker compose --project-directory /opt/globoatlas -f /opt/globoatlas/docker-compose.yml -f /opt/globoatlas/docker-compose.prod.yml exec -T nginx nginx -t
docker compose --project-directory /opt/globoatlas -f /opt/globoatlas/docker-compose.yml -f /opt/globoatlas/docker-compose.prod.yml exec -T nginx nginx -s reload
SH
chmod 700 /etc/letsencrypt/renewal-hooks/deploy/globoatlas.sh
certbot renew --cert-name lk.globokids.ru --dry-run
RENEWED_LINEAGE=/etc/letsencrypt/live/lk.globokids.ru /etc/letsencrypt/renewal-hooks/deploy/globoatlas.sh
systemctl enable --now certbot.timer
systemctl list-timers certbot.timer
```

Команды systemctl выше предполагают Certbot из пакетов Ubuntu/Debian. Для другой установки сначала проверить её механизм автоматического продления. [Документация Certbot](https://eff-certbot.readthedocs.io/en/stable/using.html#renewing-certificates).

## Перед рабочими данными и следующие обновления

Проверить вход, создание приглашения и получение письма на свой адрес, загрузку и чтение файла, отказ в доступе чужому родителю. Настроить копии PostgreSQL, хранилища и секретов вне VPS и проверить восстановление в отдельном окружении. Свежая установка приложения сама резервные копии не настраивает.

Перед обновлением сохранить проверенную резервную копию. Затем из `/opt/globoatlas`:

```bash
git pull --ff-only origin master
dcp build backend
dcp build web
dcp up -d --wait
dcp exec -T backend npx prisma migrate status
curl -fsS https://lk.globokids.ru/api/health
```

Функцию dcp нужно определить заново при новом SSH-сеансе. Миграции также автоматически выполняются при старте backend. Первого администратора повторно создавать не требуется. Для диагностики использовать `dcp ps` и `dcp logs --tail 100 backend web nginx`; перед отправкой логов исключить персональные данные и ссылки приглашений.

## Границы проверки

Локально проверяются объединённая Compose-конфигурация и команда создания администратора на отдельной PostgreSQL. Образы Docker, получение сертификата и SMTP должны быть проверены непосредственно на VPS. Только после этого можно подтверждать готовность этой установки к работе.
