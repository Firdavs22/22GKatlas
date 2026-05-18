# GloboAtlas — Production Deployment (Beget VPS)

Пошаговая инструкция запуска на VPS Beget (Москва). Все команды для **Ubuntu 22.04 / 24.04**.

> Этот документ заменяет старый DEPLOY.md. Шаги идут от свежего сервера к работающему сервису с бэкапами, HTTPS и мониторингом.

---

## 0. Что должно быть до начала

| Что | Где брать |
|---|---|
| VPS Beget (≥ 4 vCPU / 8 ГБ RAM / 80 ГБ SSD) | beget.com/ru/services/vps |
| Домен или субдомен | beget.com/ru/services/domains или твой регистратор |
| A-запись домена на IP VPS | панель регистратора |
| SSH-доступ root | панель Beget |
| SMTP (Yandex 360 / RU-CENTER / Mailgun) | для приглашений и сброса пароля |

**Минимальный тариф на 150–500 пользователей:** `VPS Comfort` (4 vCPU, 8 ГБ, 80 ГБ NVMe) ≈ 1200₽/мес.

---

## 1. Подготовка VPS

### 1.1. Подключиться по SSH

```bash
ssh root@<IP-VPS>
```

### 1.2. Создать non-root пользователя

```bash
adduser deploy
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```

Дальше всё делать **под `deploy`** (не root):

```bash
su - deploy
```

### 1.3. Системные обновления и Docker

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl ufw fail2ban git

# Docker (официальная инструкция)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# Перелогиниться, чтобы группа применилась:
exit
ssh deploy@<IP-VPS>

# Проверка
docker --version
docker compose version
```

### 1.4. Firewall

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 1.5. fail2ban (защита SSH от перебора)

```bash
sudo systemctl enable --now fail2ban
```

---

## 2. Клонирование репозитория

```bash
mkdir -p ~/apps && cd ~/apps
git clone <your-git-url> globoatlas
cd globoatlas
```

> Если код не в git — `scp -r ./globoatlas deploy@<IP>:~/apps/`.

---

## 3. Конфигурация `.env`

### 3.1. Создать файл

```bash
cp .env.example .env
chmod 600 .env  # доступ только владельцу
```

### 3.2. Сгенерировать секреты

```bash
# JWT — 48 байт base64, ~64 символа
openssl rand -base64 48

# Пароль БД — 32 байта hex
openssl rand -hex 32

# Пароль MinIO — то же самое
openssl rand -hex 32
```

### 3.3. Заполнить `.env`

```ini
# === Database ===
DB_USER=globoatlas
DB_PASSWORD=<openssl rand -hex 32>

# === JWT ===
JWT_SECRET=<openssl rand -base64 48>

# === Object Storage (SeaweedFS S3 — open-source replacement for MinIO) ===
# Env names kept as MINIO_* для совместимости с кодом
MINIO_USER=globoatlas-storage
MINIO_PASSWORD=<openssl rand -hex 32>

# === URLs ===
CORS_ORIGINS=https://app.example.com
NEXT_PUBLIC_API_URL=https://app.example.com/api
PUBLIC_APP_URL=https://app.example.com

# === SMTP (для приглашений и сброса паролей) ===
# Yandex 360 пример:
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@yourdomain.ru
SMTP_PASS=<пароль приложения из Яндекс ID>
SMTP_FROM="ГлобоАтлас <noreply@yourdomain.ru>"

# === AI (опционально) ===
AI_PROVIDER=stub
```

**Замени `app.example.com` на твой реальный домен.**

> ⚠️ `.env` **никогда** не должен попасть в git. Проверь: `git status` — файл должен быть в `.gitignore`.

---

## 4. SSL-сертификат (Let's Encrypt)

### Вариант А — через сертификаты Beget (если домен куплен у них)

В панели Beget: Домены → твой домен → SSL-сертификат → **Заказать Let's Encrypt бесплатно**.

После выпуска скачать `fullchain.pem` и `privkey.pem`, положить:

```bash
mkdir -p ~/apps/globoatlas/nginx/ssl
# Загрузить файлы через SCP с локального компа
```

### Вариант B — certbot на сервере (универсально)

```bash
sudo apt install -y certbot
sudo systemctl stop docker  # или остановить только nginx-контейнер
sudo certbot certonly --standalone -d app.example.com --agree-tos --email you@example.com

sudo mkdir -p ~/apps/globoatlas/nginx/ssl
sudo cp /etc/letsencrypt/live/app.example.com/fullchain.pem ~/apps/globoatlas/nginx/ssl/
sudo cp /etc/letsencrypt/live/app.example.com/privkey.pem ~/apps/globoatlas/nginx/ssl/
sudo chown -R deploy:deploy ~/apps/globoatlas/nginx/ssl
```

### 4.1. Обновить `nginx/nginx.conf` для HTTPS

Заменить блок `server { listen 80 ... }` на:

```nginx
server {
    listen 80;
    server_name app.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.example.com;

    ssl_certificate     /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    client_max_body_size 50M;

    # … остальное содержимое (location /api/, location /, и т.д.) …
}
```

### 4.2. Подмонтировать сертификаты в docker-compose

В `docker-compose.yml` обновить блок `nginx`:

```yaml
  nginx:
    image: nginx:alpine
    restart: unless-stopped
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl:ro
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - web
      - backend
```

### 4.3. Автообновление сертификата

```bash
sudo crontab -e
```

Добавить:

```
0 3 * * 1 certbot renew --quiet --pre-hook "docker compose -f /home/deploy/apps/globoatlas/docker-compose.yml stop nginx" --post-hook "cp /etc/letsencrypt/live/app.example.com/*.pem /home/deploy/apps/globoatlas/nginx/ssl/ && docker compose -f /home/deploy/apps/globoatlas/docker-compose.yml start nginx"
```

---

## 5. Первый запуск

```bash
cd ~/apps/globoatlas

# Сборка всех образов
docker compose build

# Запуск
docker compose up -d

# Применить миграции
docker compose exec backend npx prisma migrate deploy

# (опционально) Засеять минимальные данные
docker compose exec backend npx prisma db seed
```

Проверка:

```bash
docker compose ps                 # все Up
docker compose logs -f backend    # ищем "Nest application successfully started"
curl -I https://app.example.com   # 200 / 307
```

---

## 6. Первый вход и смена дефолтных паролей

1. Открой `https://app.example.com/login`
2. Войди как `admin@test.com / admin123`
3. **СРАЗУ** в `/admin/staff` — поменяй пароль (через invite-токен на твоей реальной почте)
4. Удали ВСЕ остальные тестовые аккаунты (`teacher@test.com`, `parent@test.com`, и т.д.) — если они не нужны
5. Создай первого настоящего админа и **выйди** из тестового

> Бэкенд автоматически создаёт `admin@test.com` через seed.ts только если БД пустая. После замены пароля seed его не перетрёт.

---

## 7. Бэкапы

### 7.1. Каталог под бэкапы

```bash
sudo mkdir -p /backup
sudo chown deploy:deploy /backup
```

### 7.2. Скрипт бэкапа

```bash
nano ~/apps/globoatlas/scripts/backup.sh
```

```bash
#!/bin/bash
set -e

BACKUP_DIR=/backup
KEEP_DAYS=30
DATE=$(date +%Y-%m-%d-%H%M)

# Postgres
docker exec globoatlas-postgres-1 pg_dump -U globoatlas globoatlas \
  | gzip > "$BACKUP_DIR/db-$DATE.sql.gz"

# SeaweedFS data (сжатый tar волюма)
docker run --rm -v globoatlas_storagedata:/data -v "$BACKUP_DIR":/backup \
  alpine tar czf "/backup/storage-$DATE.tar.gz" -C /data .

# Очистка старых
find "$BACKUP_DIR" -name 'db-*.sql.gz' -mtime +$KEEP_DAYS -delete
find "$BACKUP_DIR" -name 'minio-*.tar.gz' -mtime +$KEEP_DAYS -delete

echo "Backup done: db-$DATE.sql.gz, minio-$DATE.tar.gz"
```

```bash
chmod +x ~/apps/globoatlas/scripts/backup.sh
mkdir -p ~/apps/globoatlas/scripts
```

### 7.3. Cron — каждую ночь в 3:00

```bash
crontab -e
```

```
0 3 * * * /home/deploy/apps/globoatlas/scripts/backup.sh >> /backup/backup.log 2>&1
```

### 7.4. Восстановление

```bash
# БД
gunzip < /backup/db-2026-05-17-0300.sql.gz \
  | docker exec -i globoatlas-postgres-1 psql -U globoatlas globoatlas

# SeaweedFS
docker compose stop storage
docker run --rm -v globoatlas_storagedata:/data -v /backup:/backup \
  alpine sh -c "rm -rf /data/* && tar xzf /backup/storage-2026-05-17-0300.tar.gz -C /data"
docker compose start storage
```

> Внешнее хранилище бэкапов: после стабилизации настрой `rclone` на Selectel S3 / Yandex Object Storage для off-site копии.

---

## 8. Логи и ротация

### 8.1. Лимит размера логов Docker

В `docker-compose.yml` к каждому сервису добавить:

```yaml
    logging:
      driver: json-file
      options:
        max-size: "50m"
        max-file: "5"
```

Это сохраняет последние 250 МБ логов на сервис и автоматически ротирует.

### 8.2. Просмотр

```bash
docker compose logs -f backend           # текущие логи backend
docker compose logs --tail 200 web       # последние 200 строк web
docker compose logs --since 1h           # за последний час
```

---

## 9. Мониторинг

### 9.1. UptimeRobot (бесплатно)

- Создать аккаунт на uptimerobot.com
- Добавить монитор: `https://app.example.com/api/health` (HTTP-проверка каждые 5 мин)
- Алерт на email или Telegram

### 9.2. Sentry (бесплатно до 5k событий/мес)

- Зарегистрироваться на sentry.io
- Создать 2 проекта: `globoatlas-backend` (Node.js) и `globoatlas-web` (Next.js)
- DSN положить в `.env`:

```ini
SENTRY_DSN_BACKEND=https://xxx@sentry.io/yyy
SENTRY_DSN_WEB=https://xxx@sentry.io/zzz
```

(Интеграция в коде — задача отдельного спринта, см. roadmap.)

### 9.3. Disk-space алерт

```bash
nano ~/apps/globoatlas/scripts/disk-alert.sh
```

```bash
#!/bin/bash
USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$USAGE" -gt 80 ]; then
  curl -s -X POST "https://api.telegram.org/bot<TG_BOT_TOKEN>/sendMessage" \
    -d "chat_id=<YOUR_CHAT_ID>" \
    -d "text=⚠ GloboAtlas: диск занят на $USAGE%"
fi
```

```bash
chmod +x ~/apps/globoatlas/scripts/disk-alert.sh
crontab -e
```

```
*/15 * * * * /home/deploy/apps/globoatlas/scripts/disk-alert.sh
```

---

## 10. Обновление

```bash
cd ~/apps/globoatlas
git pull
docker compose build
docker compose up -d
docker compose exec backend npx prisma migrate deploy
```

Если миграция изменяет схему — сначала бэкап:

```bash
./scripts/backup.sh
git pull
docker compose ...
```

---

## 11. Healthcheck endpoints

| URL | Назначение |
|---|---|
| `https://app.example.com/api/health` | Backend жив (Nest + БД) |
| `https://app.example.com/` | Web рендерится |

(Endpoint `/api/health` — задача в Спринте 2.)

---

## 12. Часто встречающиеся проблемы

| Симптом | Решение |
|---|---|
| `Connection refused` к postgres | `docker compose ps` — postgres должен быть healthy. Проверь `.env.DB_PASSWORD`. |
| Фото не открываются | `docker compose logs minio` — статус. Проверь `MINIO_*` в `.env`. |
| WebSocket-чаты не работают | nginx должен пропускать Upgrade headers. См. `nginx/nginx.conf`. |
| Cert expired | `certbot renew` вручную, перезапустить nginx. |
| `Out of memory` | Увеличить swap: `sudo fallocate -l 2G /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile`. |

---

## 13. Чек-лист перед публичным запуском

- [ ] Сильные секреты в `.env` (не `CHANGE_ME`)
- [ ] HTTPS работает, redirect 80→443
- [ ] Дефолтный admin-пароль сменён
- [ ] Тестовые аккаунты (`*@test.com`) удалены или с реальными именами
- [ ] Cron бэкапы запущены, проверены первое восстановление
- [ ] Мониторинг подключён (UptimeRobot + Sentry)
- [ ] Согласие на ПДн в форме инвайта (после Спринта 1)
- [ ] Политика конфиденциальности на `/privacy`
- [ ] Регистрация оператора ПДн в Роскомнадзоре (Р4) подана за 30 дней до запуска
- [ ] Юр. лицо или ИП оформлено

---

## Контакты безопасности

Уязвимости в коде — писать **только приватно** maintainer'у. Не открывать публичные issues с подробностями.
