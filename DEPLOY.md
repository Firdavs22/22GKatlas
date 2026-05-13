# GloboAtlas — деплой в продакшен

## Что нужно

- Сервер с Docker + Docker Compose (Ubuntu 22.04+, минимум 2 CPU / 2 GB RAM / 20 GB SSD)
- Доменное имя, направленное на IP сервера (A-запись)
- Открытые порты: 80, 443

## Шаги

### 1. Клонировать проект на сервер

```bash
git clone <your-repo-url> globoatlas
cd globoatlas
```

### 2. Создать `.env`

```bash
cp .env.example .env
nano .env
```

Обязательно поменять:
- `DB_PASSWORD` — сильный пароль для PostgreSQL
- `JWT_SECRET` — сгенерировать через `openssl rand -base64 48`
- `MINIO_PASSWORD` — сильный пароль для MinIO
- `CORS_ORIGINS` — `https://your-domain.com`
- `NEXT_PUBLIC_API_URL` — `https://your-domain.com/api`

### 3. SSL-сертификат (Let's Encrypt)

```bash
sudo apt install -y certbot
sudo certbot certonly --standalone -d your-domain.com
sudo mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/
```

В `nginx/nginx.conf` раскомментировать блоки `server { listen 443 ssl ... }` и редирект 80→443. В `docker-compose.yml` добавить монтирование сертификатов в nginx:

```yaml
  nginx:
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl:ro
```

### 4. Запуск

```bash
docker compose up -d --build
docker compose exec backend npx prisma db push
docker compose exec backend npx prisma db seed
```

Готово — открой `https://your-domain.com`.

### 5. Первый вход

- Логин: `admin@test.com` / `admin123`
- **СРАЗУ** смени пароль в админ-панели

### 6. Бэкапы (cron)

```bash
crontab -e
```

```
0 3 * * * docker exec globoatlas-postgres-1 pg_dump -U globoatlas globoatlas | gzip > /backup/db-$(date +\%F).sql.gz
0 4 * * * tar czf /backup/minio-$(date +\%F).tar.gz -C /var/lib/docker/volumes/globoatlas_miniodata _data
```

## Онлайн-редактирование контента

После деплоя всё управление содержимым происходит через веб-интерфейс:

- **Админ** (`/admin`) — пользователи, группы, дети, расписания, навыки, новости, оплаты
- **Учитель** (`/teacher`) — прогресс детей, портфолио, дневник, домашние задания
- **Родитель** (`/parent`) — просмотр прогресса, чаты, оплаты, лента
- **Специалист** (`/psychologist`, `/pediatrician`) — наблюдения, профили детей

Все изменения сохраняются в PostgreSQL в реальном времени, файлы — в MinIO, чаты работают через WebSocket.

## Обновление кода

```bash
git pull
docker compose up -d --build
docker compose exec backend npx prisma db push
```

## Логи и мониторинг

```bash
docker compose logs -f backend     # backend
docker compose logs -f web         # frontend
docker compose logs -f nginx       # nginx
docker compose ps                  # статус контейнеров
```

## Восстановление БД из бэкапа

```bash
gunzip < /backup/db-2026-05-11.sql.gz | docker exec -i globoatlas-postgres-1 psql -U globoatlas globoatlas
```
