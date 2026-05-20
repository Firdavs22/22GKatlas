# GloboAtlas — Production Deployment (Beget VPS)

Пошаговая инструкция запуска на VPS Beget. Все команды для **Ubuntu 22.04 / 24.04**.

> Файл актуализирован под текущее состояние репо:
> используются `docker-compose.prod.yml` (override) и `nginx/nginx.prod.conf` — в репо они уже есть, никаких ручных правок в dev-конфигах делать не нужно.

---

## 0. Что должно быть до начала

| Что | Где брать |
|---|---|
| VPS Beget (≥ 4 vCPU / 6 ГБ RAM / 80 ГБ SSD) | beget.com/ru/services/vps |
| Домен или субдомен | beget.com/ru/services/domains или твой регистратор |
| A-запись домена `@` и `www` на IP VPS | панель регистратора |
| SSH-доступ под `deploy` (см. раздел 1) | панель Beget — пароль root для первого захода |
| SMTP (Yandex 360 / RU-CENTER / Mailgun) | для приглашений и сброса пароля |
| Локальный SSH-ключ на твоей машине | `~/.ssh/id_ed25519` |

**Рекомендуемый тариф для пилота 50–150 пользователей:** 4 vCPU / 6–8 ГБ RAM / 80 ГБ NVMe (≈ 1000–1500₽/мес).
Для закрытого демо до 10 человек хватит 2 vCPU / 4 ГБ / 40 ГБ, но билд Next.js на 4 ГБ требует обязательный swap (см. 1.8).

---

## 1. Подготовка VPS

### 1.1. Подключиться по SSH под root

```bash
ssh root@<IP-VPS>
```

(пароль root — из панели Beget при создании VPS)

### 1.2. Создать non-root пользователя

```bash
adduser deploy
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```

Дальше всё делать **под `deploy`** (не root):

```bash
exit
ssh deploy@<IP-VPS>
```

### 1.3. Поставить свой SSH-ключ (на локальной машине)

На своём компьютере (Mac/Linux/Windows) проверь, есть ли у тебя ключ:

```bash
ls ~/.ssh/id_ed25519.pub
```

Если нет — сгенерируй:

```bash
ssh-keygen -t ed25519 -C "globoatlas-deploy"
```

Скопируй публичный ключ на сервер:

```bash
ssh-copy-id deploy@<IP-VPS>
```

Проверь, что вход работает по ключу без запроса пароля:

```bash
ssh deploy@<IP-VPS>
```

### 1.4. Отключить вход по паролю и root

**⚠️ Только после того, как 1.3 точно работает.** Не закрывай текущую SSH-сессию до проверки.

```bash
sudo nano /etc/ssh/sshd_config
```

Изменить (раскомментировать и/или поправить значения):

```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

На Ubuntu часто есть дополнительный файл, перебивающий основные настройки — проверь:

```bash
ls /etc/ssh/sshd_config.d/
```

Если есть, например, `50-cloud-init.conf` — открой и тоже поставь `PasswordAuthentication no`.

Проверка синтаксиса перед рестартом:

```bash
sudo sshd -t
```

Применить:

```bash
sudo systemctl restart ssh
```

**В новом окне терминала** проверь, что вход по ключу ещё работает:

```bash
ssh deploy@<IP-VPS>
```

И что пароль действительно отключён:

```bash
ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no deploy@31.129.107.181
# должно вернуть: Permission denied (publickey).
```

Если оба теста ✅ — старую сессию можно закрывать.

### 1.5. Системные обновления и Docker

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl ufw fail2ban git unattended-upgrades

# Автоустановка security-патчей
sudo dpkg-reconfigure -plow unattended-upgrades   # выбрать Yes

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

### 1.6. Firewall

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

### 1.7. fail2ban (защита SSH от перебора)

```bash
sudo systemctl enable --now fail2ban
sudo fail2ban-client status sshd
```

### 1.8. Swap (страховка от OOM при билдах)

На 4 ГБ RAM — обязательно. На 6+ ГБ — рекомендуется как защита от пиков.

```bash
sudo fallocate -l 2G /swapfile        # на 4GB RAM поставь -l 4G
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Использовать swap только при сильном дефиците RAM
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

free -h                                # проверка
```

---

## 2. Клонирование репозитория

```bash
mkdir -p ~/apps && cd ~/apps
git clone https://github.com/Firdavs22/22GKatlas.git globoatlas
cd globoatlas
git checkout master
```

---

## 3. Конфигурация `.env`

### 3.1. Создать файл

```bash
cp .env.production.example .env
chmod 600 .env                          # доступ только владельцу
```

### 3.2. Сгенерировать секреты

```bash
# JWT — 48 байт base64, ~64 символа
openssl rand -base64 48

# Пароль БД — 32 байта hex
openssl rand -hex 32

# Пароль object storage — то же самое
openssl rand -hex 32
```

### 3.3. Заполнить `.env`

```bash
nano .env
```

```ini
# === Database ===
DB_USER=globoatlas
DB_PASSWORD=<openssl rand -hex 32>

# === JWT ===
JWT_SECRET=<openssl rand -base64 48>

# === Object Storage (SeaweedFS S3) ===
# Env names kept as MINIO_* для совместимости с кодом
MINIO_USER=globoatlas-storage
MINIO_PASSWORD=<openssl rand -hex 32>

# === URLs ===
# NEXT_PUBLIC_API_URL — корневой URL без /api (фронт сам добавит /api).
# Эти переменные вшиваются в бандл при build, изменение требует ребилд web.
CORS_ORIGINS=https://your-domain.ru
NEXT_PUBLIC_API_URL=https://your-domain.ru
NEXT_PUBLIC_WS_URL=https://your-domain.ru
PUBLIC_APP_URL=https://your-domain.ru

# === SMTP (Yandex 360 пример) ===
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@yourdomain.ru
SMTP_PASS=<пароль приложения из Яндекс ID, не основной>
SMTP_FROM=ГлобоАтлас <noreply@yourdomain.ru>

# === AI (опционально) ===
AI_PROVIDER=stub

# === Sentry — оставить пустым ===
# Sentry-серверы вне РФ. Включать только после согласия субъектов
# на трансграничную передачу ПДн (152-ФЗ).
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=

APP_VERSION=prod
```

> ⚠️ `.env` **никогда** не должен попасть в git. Проверь: файл в `.gitignore`.

---

## 4. SSL-сертификат (Let's Encrypt)

Прод-конфиг nginx (`nginx/nginx.prod.conf`) и `docker-compose.prod.yml` уже в репо — ничего вручную править не нужно. Достаточно положить сертификаты в `nginx/ssl/`.

### 4.1. Получить сертификат через certbot

```bash
sudo apt install -y certbot
sudo certbot certonly --standalone \
  -d your-domain.ru \
  --agree-tos -m you@email.ru
```

> Для корневого домена (например `example.com`) обычно добавляют второй флаг `-d www.example.com`, чтобы один сертификат покрывал и www-вариант. Для **поддомена** (например `lk.example.com`) этот флаг не нужен — запись `www.lk.example.com` обычно не существует, и Let's Encrypt свалится с NXDOMAIN.

> Если у Beget стоит софт, занимающий порт 80, временно останови его перед certbot. Обычно на чистом VPS ничего на 80 не висит.

### 4.2. Скопировать сертификаты в каталог проекта

```bash
sudo mkdir -p ~/apps/globoatlas/nginx/ssl
sudo cp /etc/letsencrypt/live/your-domain.ru/fullchain.pem ~/apps/globoatlas/nginx/ssl/
sudo cp /etc/letsencrypt/live/your-domain.ru/privkey.pem  ~/apps/globoatlas/nginx/ssl/
sudo chown -R deploy:deploy ~/apps/globoatlas/nginx/ssl
chmod 600 ~/apps/globoatlas/nginx/ssl/*.pem
```

### 4.3. Автообновление сертификата

```bash
sudo crontab -e
```

Добавить:

```
0 3 * * 1 certbot renew --quiet --pre-hook "docker compose -f /home/deploy/apps/globoatlas/docker-compose.yml -f /home/deploy/apps/globoatlas/docker-compose.prod.yml stop nginx" --post-hook "cp /etc/letsencrypt/live/your-domain.ru/*.pem /home/deploy/apps/globoatlas/nginx/ssl/ && docker compose -f /home/deploy/apps/globoatlas/docker-compose.yml -f /home/deploy/apps/globoatlas/docker-compose.prod.yml start nginx"
```

### 4.4. (Опционально) сделать алиас, чтобы не писать длинную команду

```bash
echo 'alias dcp="docker compose -f docker-compose.yml -f docker-compose.prod.yml"' >> ~/.bashrc
source ~/.bashrc
```

Дальше в инструкции я буду писать полную форму. Если поставил алиас — заменяй `docker compose -f docker-compose.yml -f docker-compose.prod.yml` на `dcp`.

---

## 5. Первый запуск

```bash
cd ~/apps/globoatlas

# Сборка всех образов (5–15 мин)
docker compose -f docker-compose.yml -f docker-compose.prod.yml build

# Запуск
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Применить миграции
docker compose exec backend npx prisma migrate deploy

# Засеять тестовые данные (создаст admin@test.com / admin123)
docker compose exec backend npx prisma db seed
```

Проверка:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps   # все Up / healthy
docker compose logs -f backend    # ищем "Nest application successfully started"
curl -I https://your-domain.ru    # 200 / 301
```

---

## 6. Первый вход и смена дефолтных паролей

1. Открой `https://your-domain.ru/login`
2. Войди как `admin@test.com / admin123`
3. `/admin/staff` — создай своего настоящего админа на свой реальный email (придёт invite-ссылка)
4. Выйди, войди под собой
5. В `/settings` — смени пароль
6. В `/admin/staff` удали все тестовые `*@test.com` (или хотя бы смени им пароли)
7. В `/admin/site-content` залей настоящую политику конфиденциальности

> Бэкенд создаёт `admin@test.com` через `seed.ts` только если БД пустая. После замены пароля seed его не перетрёт.

---

## 7. Бэкапы

### 7.1. Каталог под бэкапы

```bash
sudo mkdir -p /backup
sudo chown deploy:deploy /backup
```

### 7.2. Скрипт бэкапа

В репо уже лежит `scripts/backup.sh`. Дай ему права и проверь содержимое:

```bash
chmod +x ~/apps/globoatlas/scripts/backup.sh
cat ~/apps/globoatlas/scripts/backup.sh
```

Если используешь собственную версию, скрипт должен делать:

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
find "$BACKUP_DIR" -name 'db-*.sql.gz'      -mtime +$KEEP_DAYS -delete
find "$BACKUP_DIR" -name 'storage-*.tar.gz' -mtime +$KEEP_DAYS -delete

echo "Backup done: db-$DATE.sql.gz, storage-$DATE.tar.gz"
```

### 7.3. Cron — каждую ночь в 3:00

```bash
crontab -e
```

```
0 3 * * * /home/deploy/apps/globoatlas/scripts/backup.sh >> /backup/backup.log 2>&1
```

### 7.4. Тестовое восстановление (сделать ДО запуска пользователей)

```bash
# БД
gunzip < /backup/db-2026-05-19-0300.sql.gz \
  | docker exec -i globoatlas-postgres-1 psql -U globoatlas globoatlas

# SeaweedFS
docker compose -f docker-compose.yml -f docker-compose.prod.yml stop storage
docker run --rm -v globoatlas_storagedata:/data -v /backup:/backup \
  alpine sh -c "rm -rf /data/* && tar xzf /backup/storage-2026-05-19-0300.tar.gz -C /data"
docker compose -f docker-compose.yml -f docker-compose.prod.yml start storage
```

> **Off-site копия**: после стабилизации настрой `rclone` на Yandex Object Storage / Selectel S3 — храни вторую копию вне сервера.

---

## 8. Логи и ротация

Лимит логов уже включён в `docker-compose.yml` — 50 МБ × 5 файлов на сервис.

```bash
docker compose logs -f backend                  # текущие логи backend
docker compose logs --tail 200 web              # последние 200 строк web
docker compose logs --since 1h                  # за последний час
```

---

## 9. Мониторинг

### 9.1. UptimeRobot (бесплатно)

- Зарегистрироваться на uptimerobot.com
- Add Monitor → HTTPS → URL: `https://your-domain.ru/api/health`, интервал 5 мин
- Алерт на email или Telegram-бота

### 9.2. Sentry (опционально, осторожно с ПДн)

Каркас в коде есть, но **отключён по умолчанию**.

> **152-ФЗ**: Sentry-серверы в EU/US. Без явного согласия субъектов на трансграничную передачу ПДн — не включать. После запуска юр-блока согласовать с юристом, настроить scrubbing, и только тогда заполнить `SENTRY_DSN` в `.env`.

### 9.3. Disk-space алерт

Готовый скрипт лежит в `scripts/disk-alert.sh`. Подставь свои Telegram bot token и chat id, потом:

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

# Бэкап перед обновлением (если миграция меняет схему)
./scripts/backup.sh

git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
docker compose exec backend npx prisma migrate deploy
```

---

## 11. Healthcheck endpoints

| URL | Назначение |
|---|---|
| `https://your-domain.ru/api/health` | Backend жив (Nest + БД) |
| `https://your-domain.ru/` | Web рендерится |

---

## 12. Часто встречающиеся проблемы

| Симптом | Решение |
|---|---|
| `Connection refused` к postgres | `docker compose ps` — postgres должен быть healthy. Проверь `.env.DB_PASSWORD`. |
| Фото не открываются | `docker compose logs storage` — статус. Проверь `MINIO_*` в `.env`. |
| WebSocket-чаты не работают | nginx должен пропускать Upgrade headers. Проверь, что подгружен `nginx.prod.conf`. |
| Cert expired | `certbot renew` вручную, перезапустить nginx через prod-compose. |
| `Out of memory` при билде | Добавить swap (см. 1.8) или собирать с флагом `NODE_OPTIONS=--max-old-space-size=1024` |
| После `systemctl restart ssh` не пускает | Beget панель → Терминал/VNC → откатить `sshd_config` |

---

## 13. Чек-лист перед публичным запуском

- [ ] SSH ключи настроены, вход по паролю отключён (`PasswordAuthentication no`)
- [ ] `PermitRootLogin no`
- [ ] UFW активен, открыты только 22/80/443
- [ ] fail2ban работает (`fail2ban-client status sshd`)
- [ ] Swap создан, swappiness=10
- [ ] Сильные секреты в `.env` (не `CHANGE_ME`)
- [ ] `.env` имеет права 600 и в `.gitignore`
- [ ] HTTPS работает, redirect 80→443
- [ ] HSTS-заголовок отдаётся (проверь `curl -I https://your-domain.ru`)
- [ ] Дефолтный admin-пароль сменён
- [ ] Тестовые аккаунты (`*@test.com`) удалены или с реальными именами
- [ ] Cron бэкапы запущены, тестовое восстановление пройдено
- [ ] UptimeRobot подключён к `/api/health`
- [ ] Согласие на ПДн в форме инвайта работает
- [ ] Политика конфиденциальности залита в `/admin/site-content`
- [ ] Sentry **выключен** (или включён только после согласия пользователей)
- [ ] Юр.лицо или ИП оформлено
- [ ] Регистрация оператора ПДн в Роскомнадзоре (форма Р4) подана за 30 дней до публичного запуска

---

## Контакты безопасности

Уязвимости в коде — писать **только приватно** maintainer'у. Не открывать публичные issues с подробностями.
