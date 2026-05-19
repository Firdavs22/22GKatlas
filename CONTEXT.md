# GloboAtlas · Контекст диалога для продолжения

> Этот файл — компактный снимок всех решений и состояния проекта.
> Используется чтобы продолжить работу на другом устройстве или в новой сессии.
> Последнее обновление: 2026-05-19.

---

## 0. Что за проект

**GloboAtlas** — система управления Монтессори детским садом. SaaS-приложение для одного сада на 5-500 детей.

- **Юр. имя**: ещё нет (планируется ИП/ООО)
- **Целевая страна**: Россия → 152-ФЗ применим, серверы должны быть в РФ
- **Целевые пользователи**: 5-500 родителей + 5-30 сотрудников сада
- **Репо**: https://github.com/Firdavs22/22GKatlas (private/public — твой)
- **Локальный путь**: `d:\App\22kids\globoatlas\`

---

## 1. Технологический стек

| Слой | Технология |
|---|---|
| Backend | NestJS 11 + Prisma 5.22 + PostgreSQL 16 |
| Frontend (web) | Next.js 14 App Router + Tailwind + TypeScript |
| Mobile | Expo 54 + Expo Router + React Native 0.81 |
| Object storage | SeaweedFS S3-compatible (заменил MinIO, который Inc заархивировали) |
| Очереди | Bull + Redis 7 |
| Real-time | Socket.io 4 (чаты) |
| Mail | nodemailer (Yandex 360 / Mailgun / любой SMTP) |
| Infra | Docker Compose + Nginx |
| Mobile dev | Podman / Docker, Expo Go для тестов |

**Окружение dev**: Windows + Podman + PowerShell + Git Bash.

---

## 2. Что уже сделано — за всё время

### ✅ Спринт 0 — основа (до этого диалога)
- 5 ролей: admin, teacher, parent, psychologist, pediatrician
- Дашборд для каждой роли
- Карта развития (зоны Монтессори, навыки, стадии)
- Лента группы, чаты, портфолио, дневник наблюдений
- AI-помощник для дневника наблюдений (опционально, через OpenAI-совместимый endpoint)
- Импорт навыков из Excel (есть файл `globoatlas-skills-v2.xlsx`)
- Auth: JWT + refresh-токены, invite через email
- Mobile (Expo): 44 экрана покрывают парент / teacher / psy / ped / admin (минимум)

### ✅ Спринт 1 — юр-блокеры (152-ФЗ)
- `consentGivenAt` на User — обязательное согласие при активации инвайта
- Страница `/privacy` (редактируется через `/admin/site-content`)
- `/settings` — смена данных, смена пароля, **удаление аккаунта** (soft-delete + анонимизация)
- Forgot/reset password flow через email

### ✅ Спринт 2 — observability + audit
- `/api/health` endpoint
- Docker healthchecks для всех сервисов
- Audit log (таблица + interceptor + `/admin/audit` viewer)
- Sentry интеграция (no-op без DSN)
- Log rotation в docker-compose (50MB × 5 файлов)
- Ops-скрипты: `scripts/backup.sh`, `disk-alert.sh`, `cleanup-deleted-users.sh`
- Helmet, FileMeta (контроль доступа к файлам), crypto.randomBytes для invite-паролей, DTO для критичных endpoints

### ✅ Спринт 3 — выпуск-ready
- **Data export** для родителя (`GET /me/export`) → стримит ZIP с фото + JSON прогресса/посещаемости/наблюдений (152-ФЗ требование)
- **JWT в httpOnly cookies + CSRF** (middleware double-submit token; mobile использует Bearer header, CSRF не нужен)
- **MIME валидация через file-type** (magic bytes)
- **Per-route rate limiting** для login/upload/forgot
- **Роль superadmin** + ограничения для обычного admin (см. ниже)
- **Онбординг** для parent/teacher/specialist (web + mobile модалка с 4 слайдами, повторный показ через `/settings` → «Посмотреть тур»)

### ✅ Документация
- [`SETUP_PROD.md`](SETUP_PROD.md) — пошаговая инструкция деплоя на Beget VPS
- [`ROADMAP.md`](ROADMAP.md) — статус, что осталось
- [`MOBILE_TODO.md`](MOBILE_TODO.md) — план мобильного приложения по ролям
- [`MOBILE_BUILD.md`](MOBILE_BUILD.md) — сборка iOS/Android, EAS, TestFlight, RuStore

---

## 3. Текущая модель ролей

```
superadmin  ← один (изначально admin@test.com), полный доступ ко всему
   ↑
admin       ← создаётся через UI, доступно ВСЁ кроме: site-content, audit, reports, skills, staff
   |
teacher      parent      psychologist     pediatrician
```

**Skрытые от обычного admin меню-пункты** (доступны только superadmin):
1. Настройки системы (`/admin/site-content`)
2. Журнал действий (`/admin/audit`)
3. Отчёты (`/admin/reports`)
4. Навыки (`/admin/skills`)
5. Сотрудники (`/admin/staff`)

Backend enforce'ит это через `@Roles('superadmin')` декоратор.

---

## 4. Дефолтные тестовые аккаунты

В `seed.ts`:

| Email | Пароль | Роль |
|---|---|---|
| admin@test.com | admin123 | **superadmin** (промоутнут миграцией) |
| teacher@test.com | teacher123 | teacher |
| parent@test.com | parent123 | parent |
| psychologist@test.com | psych123 | psychologist |
| pediatrician@test.com | peds123 | pediatrician |

**При деплое на прод:** войти под admin@test.com → создать своего админа через `/admin/staff` → удалить тестовые `*@test.com`.

---

## 5. Решённые вопросы (контекст диалога)

| Вопрос | Решение |
|---|---|
| **VPS для пилота** | Beget 4 ГБ / 40 ГБ / 33₽ в день (≈ 1000₽/мес). Ubuntu 24.04 LTS, Москва. |
| **Object storage** | SeaweedFS на том же VPS пока пилот. Миграция на Beget CloudStor когда диск > 50% — изменить 3 переменные в `.env` |
| **iOS App Store доступ** | Нужен прокси Apple Developer аккаунт (Казахстан/Армения/Грузия) — РФ-аккаунты Apple не выдаёт с 2022. Иначе только TestFlight для пилотов. |
| **Android** | RuStore (free, нужно юр.лицо) или прямая раздача APK |
| **Регистрация Роскомнадзора (152-ФЗ)** | НЕ нужна для закрытого пилота с приглашёнными участниками. Нужна за 30 дней до публичного запуска. |
| **Мониторинг** | На пилот — только **UptimeRobot** (free, пинг `/api/health`). SigNoz — отдельный 8GB VPS, отложить до 200+ юзеров. |
| **Sentry в проде** | Каркас в коде есть, но **отключён по умолчанию**. Без согласия субъектов на трансграничную передачу ПДн — не включать. |
| **JWT cookies** | httpOnly + CSRF double-submit для веба, Bearer для мобилки |

---

## 6. Что осталось делать — приоритеты

### 🟢 До деплоя кода — НЕТ. Код готов.

### 🟡 Параллельно (вне кода)
- [ ] Купить домен и направить A-запись на VPS
- [ ] Регистрация юр.лица / ИП
- [ ] Юрист → текст политики конфиденциальности (заливать через `/admin/site-content`)
- [ ] (Опционально) подача формы Р4 в Роскомнадзор — нужно за 30 дней до публичного запуска

### 🔵 После запуска — улучшения
- [ ] DTO для оставшихся ~20 endpoints (audit security ровный → зелёный)
- [ ] Прокси Apple Developer для iOS публикации
- [ ] Перевод mobile login.tsx / new-post.tsx с `fontFamily: 'serif'` на Nunito
- [ ] Replace `https://your-domain.ru` в `mobile/lib/api.ts:30` на боевой
- [ ] SigNoz / GlitchTip когда юзеров > 200
- [ ] Миграция на Beget CloudStor когда диск > 50%

---

## 7. Структура `.env` (по слотам)

`.env` живёт ТОЛЬКО на VPS, в git его нет. Шаблон: `.env.production.example`.

```ini
DB_USER=globoatlas
DB_PASSWORD=<openssl rand -hex 32>

JWT_SECRET=<openssl rand -base64 48>

# SeaweedFS S3 credentials (env-имена MINIO_* оставлены для backward compat)
MINIO_USER=globoatlas-storage
MINIO_PASSWORD=<openssl rand -hex 32>

CORS_ORIGINS=https://app.example.com
NEXT_PUBLIC_API_URL=https://app.example.com/api
PUBLIC_APP_URL=https://app.example.com

# SMTP — Yandex 360 рекомендуется
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@yourdomain.ru
SMTP_PASS=<пароль приложения из Яндекс ID>
SMTP_FROM=ГлобоАтлас <noreply@yourdomain.ru>

AI_PROVIDER=stub
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
APP_VERSION=prod
```

**Скрипты ротации credentials** (когда уже на проде):
- `scripts/rotate-db-password.sh` — смена только пароля БД
- `scripts/rotate-db-user.sh` — смена и имени пользователя БД

---

## 8. Дефолтные пути и команды

```bash
# На локальной машине
cd d:/App/22kids/globoatlas
podman compose up -d --build
podman compose exec backend npx prisma migrate deploy
podman compose exec backend npx prisma db seed

# Логи
podman compose logs -f backend
podman compose logs -f web

# Health
curl http://localhost:3001/api/health
```

```bash
# На VPS после деплоя
cd ~/apps/globoatlas
docker compose up -d --build
docker compose logs -f backend

# Бэкап вручную
./scripts/backup.sh

# Ротация пароля БД
./scripts/rotate-db-password.sh
```

---

## 9. Git workflow

- Все коммиты в стиле `22` (по запросу пользователя — соответствует существующей истории)
- Push в `master`: `git push origin master`
- Force-push разрешён только на свои незакоммитные правки (`--force-with-lease`)
- **`.env`, `*.sql.gz`, `*.log`, `NUL` — в `.gitignore`**, никогда не попадают на GitHub

---

## 10. Чек-лист для деплоя (краткий)

После заказа VPS:

```bash
# === На VPS ===
# 1. Подготовка
ssh root@<IP-VPS>
adduser deploy && usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
exit && ssh deploy@<IP-VPS>
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl ufw fail2ban git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
exit && ssh deploy@<IP-VPS>
sudo ufw default deny incoming && sudo ufw allow OpenSSH
sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw enable
sudo systemctl enable --now fail2ban

# 2. Код
mkdir -p ~/apps && cd ~/apps
git clone https://github.com/Firdavs22/22GKatlas.git globoatlas
cd globoatlas

# 3. .env (заполнить руками!)
cp .env.production.example .env
chmod 600 .env
openssl rand -base64 48  # JWT_SECRET
openssl rand -hex 32     # DB_PASSWORD
openssl rand -hex 32     # MINIO_PASSWORD
nano .env

# 4. SSL — Let's Encrypt через панель Beget или certbot
mkdir -p nginx/ssl
# (скопировать fullchain.pem + privkey.pem в nginx/ssl/)

# 5. Запуск
docker compose up -d --build
docker compose ps

# 6. Первый вход на https://your-domain.ru
# → admin@test.com / admin123 → создать своего админа → удалить тестовых

# 7. Cron + бэкапы
sudo mkdir -p /backup && sudo chown deploy:deploy /backup
chmod +x ~/apps/globoatlas/scripts/backup.sh
crontab -e
# Добавить: 0 3 * * * /home/deploy/apps/globoatlas/scripts/backup.sh >> /backup/backup.log 2>&1

# 8. UptimeRobot
# uptimerobot.com → Add Monitor → HTTPS → URL: https://your-domain.ru/api/health
```

---

## 11. Где смотреть детали (по теме)

| Хочешь узнать… | Куда заглянуть |
|---|---|
| Полная инструкция деплоя | [`SETUP_PROD.md`](SETUP_PROD.md) |
| Что осталось сделать | [`ROADMAP.md`](ROADMAP.md) |
| Состояние мобильного приложения | [`MOBILE_TODO.md`](MOBILE_TODO.md) |
| Сборка APK/IPA | [`MOBILE_BUILD.md`](MOBILE_BUILD.md) |
| Дев-замечания | [`MAKE_NO_MISTAKES_CLAUDE.md`](MAKE_NO_MISTAKES_CLAUDE.md) (gitignored) |
| Схема БД | `backend/prisma/schema.prisma` |
| Миграции | `backend/prisma/migrations/` |

---

## 12. Контактные ниточки

- Apple Developer: пока нет (нужен прокси-юрлицо)
- Beget: ещё не заказан (планируется 4 ГБ / 33₽ в день)
- Домен: пока нет
- SMTP: пока нет (Yandex 360 в планах)

---

## 13. Что сказать новому ассистенту

Если продолжаешь работу с этим проектом в новой Claude-сессии, открой этот файл и `ROADMAP.md`, и кратко расскажи:

> Я работаю над GloboAtlas — Монтессори детский сад SaaS под РФ.
> Стек: NestJS + Prisma + PG + Next.js + Expo. Storage — SeaweedFS S3.
> Деплой на Beget VPS. Сейчас этап подготовки прод-запуска — пилот 5-10 садов.
> Прочитай CONTEXT.md и ROADMAP.md, чтобы понять состояние.
> Все коммиты делаем в стиле "22" (одно слово, как в истории).
> Прод-секреты живут только на VPS, в git их нет.

Этого достаточно, чтобы новый ассистент догнал контекст за 30 секунд.

---

**Конец контекста. Последний коммит:** `923b738 22`
