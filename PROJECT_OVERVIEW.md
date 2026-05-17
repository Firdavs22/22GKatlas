# GloboAtlas: как устроено приложение

Документ описывает текущее состояние проекта в каталоге `globoatlas`: из каких частей он состоит, на каких технологиях построен, как связаны backend, web, mobile, база данных, файлы и деплой.

## Назначение

`GloboAtlas` — система управления детским садом с веб-кабинетами для разных ролей и мобильным приложением. Основные сценарии:

- администратор управляет группами, детьми, родителями, сотрудниками, навыками, оплатами, посещаемостью, меню, событиями и рассылками;
- педагог ведет прогресс детей, наблюдения, портфолио, дневник, задания, ленту и чаты;
- родитель смотрит расписание, меню, ленту, дневник, прогресс, посещаемость, оплаты, записи к специалистам и чаты;
- психолог и педиатр работают с назначенными детьми, заметками, рекомендациями, слотами приема и чатами;
- система хранит файлы в объектном хранилище, поддерживает WebSocket-чаты и генерацию текстов наблюдений через AI-провайдер или fallback-шаблон.

## Состав репозитория

```text
globoatlas/
  backend/        NestJS API, Prisma, бизнес-логика, WebSocket, загрузка файлов
  web/            Next.js веб-приложение для ролей admin/teacher/parent/specialist
  mobile/         Expo React Native мобильное приложение
  nginx/          reverse proxy для web, API и Socket.IO
  docker-compose.yml
  DEPLOY.md
  .env.example
  .env.production.example
```

В корне `D:\App\22kids` также есть:

- `montessori-dashboard.jsx` — отдельный React-прототип дашборда с графиками Recharts и захардкоженными demo-данными;
- `globoatlas-skills-v2.xlsx` — Excel-файл с данными навыков;
- `package-lock.json` — одиночный lock-файл вне основного приложения.

## Общая архитектура

Приложение построено как классический full-stack:

```text
Browser / Mobile
   |
   | HTTP REST / Socket.IO
   v
Next.js web / Expo app
   |
   v
NestJS backend, global prefix /api
   |
   +-- PostgreSQL через Prisma
   +-- MinIO для файлов
   +-- Redis, подготовлен в docker-compose
   +-- SMTP для email-приглашений
   +-- AI endpoint для генерации наблюдений
```

В production `nginx` проксирует:

- `/` в контейнер `web:3000`;
- `/api/` в `backend:3001`;
- `/socket.io/` в backend с upgrade-заголовками для WebSocket.

## Backend

Backend находится в `backend/` и построен на:

- Node.js 20;
- NestJS 11;
- TypeScript;
- Prisma 5;
- PostgreSQL;
- JWT + refresh tokens;
- Socket.IO;
- MinIO;
- Sharp для обработки изображений;
- Nodemailer для почты;
- pdfmake и archiver для отчетов/выгрузок;
- xlsx для импорта данных.

Точка входа: `backend/src/main.ts`.

Ключевые настройки:

- глобальный API-префикс: `/api`;
- порт: `3001`;
- `ValidationPipe` с `whitelist`, `transform`, `forbidNonWhitelisted`;
- CORS берется из `CORS_ORIGINS`;
- rate limit HTTP-запросов через `@nestjs/throttler`: 100 запросов в минуту.

Главный модуль: `backend/src/app.module.ts`.

Подключенные Nest-модули:

- `AuthModule` — логин, refresh/logout, invite flow, текущий пользователь;
- `AdminModule` — административное управление группами, детьми, родителями, staff, навыками, посещаемостью, оплатами и отчетами;
- `ChildrenModule` — карточки детей, прогресс, наблюдения, портфолио, посещаемость, оплаты, заметки, задания;
- `FeedModule` — лента, лайки, скачивание материалов ребенка;
- `ChatsModule` — REST и WebSocket-чаты;
- `NotificationsModule` — уведомления;
- `GroupsModule` — расписания групп;
- `ScheduleModule` — редактирование расписаний;
- `FilesModule` — загрузка и выдача файлов;
- `ActivitiesModule` — меню, события, рассылки;
- `MailModule` — отправка email;
- `AiModule` — генерация текстов наблюдений;
- `KbModule` — база знаний;
- `AppointmentsModule` — слоты и записи к специалистам;
- `SiteContentModule` — редактируемый JSON-контент сайта;
- `CommonModule` — guard/decorator/access-control инфраструктура.

## API

Все REST-эндпоинты доступны под `/api`.

Основные группы маршрутов:

- `/auth` — login, refresh, logout, logout-all, sessions, invite/check, invite/accept, me;
- `/admin` — CRUD групп, детей, родителей, сотрудников, областей, skill groups, skills, посещаемости, оплат, отчетов;
- `/children` — список и карточка ребенка, прогресс, история прогресса, наблюдения, портфолио, посещаемость, оплаты, заметки, feed, home tasks;
- `/feed` — лента, создание публикаций, лайки, удаление, скачивание архива по ребенку;
- `/chats` — комнаты, сообщения, unread, staff;
- `/notifications` — список и read-all;
- `/groups/:id/schedule` — расписание группы;
- `/activities` — меню, события, рассылки;
- `/appointments` — слоты специалистов, доступные слоты, записи, отмена;
- `/kb` — категории и статьи базы знаний;
- `/site-content` — редактируемые JSON-блоки;
- `/upload`, `/upload/batch`, `/files/:filename` — файлы;
- `/ai/observation` — генерация текста наблюдения.

## Авторизация и доступы

Роли заданы в Prisma enum `Role`:

- `admin`;
- `teacher`;
- `parent`;
- `psychologist`;
- `pediatrician`.

Авторизация устроена так:

- пользователь логинится по email/password;
- пароль проверяется через `bcryptjs`;
- backend выдает access token JWT и refresh token;
- refresh token хранится в таблице `RefreshToken`, ротируется при обновлении и живет 30 дней;
- access token подписывается через `@nestjs/jwt`;
- web хранит token/refreshToken/user в `localStorage`, а `token` и `role` дополнительно кладет в cookie для middleware;
- mobile хранит токены через `expo-secure-store`.

Доступы ограничиваются:

- `RolesGuard` — проверяет роль пользователя;
- `ChildAccessGuard` — проверяет доступ к ребенку:
  - admin видит всех;
  - teacher видит детей своей группы;
  - parent видит только связанных детей;
  - psychologist/pediatrician видят назначенных детей.

## База данных

ORM: Prisma.

Схема: `backend/prisma/schema.prisma`.

База: PostgreSQL.

Основные сущности:

- `User` — пользователи и роли;
- `Child`, `Group`, `ChildParent`, `ChildSpecialist` — структура сада и связи пользователей с детьми;
- `Attendance`, `Payment` — посещаемость и оплаты;
- `Area`, `SkillGroup`, `Skill`, `Progress`, `ProgressHistory` — матрица развития и история прогресса;
- `Observation`, `PortfolioItem`, `HomeTask` — педагогические наблюдения, портфолио, задания;
- `SpecialistNote` — заметки психолога/педиатра с видимостью;
- `FeedItem`, `FeedLike` — лента и лайки;
- `ChatRoom`, `ChatParticipant`, `ChatMessage` — чаты;
- `Schedule` — расписание групп;
- `Menu`, `Event`, `Broadcast` — меню, события, рассылки;
- `Notification` — уведомления;
- `KbCategory`, `KbArticle` — база знаний;
- `AppointmentSlot`, `AppointmentBooking` — запись к специалистам;
- `RefreshToken` — refresh-сессии;
- `SiteContent` — редактируемые JSON-блоки.

Seed настроен через `backend/package.json`:

```bash
npx prisma db seed
```

Фактически команда seed указывает на `ts-node -P tsconfig.seed.json prisma/seed.ts`.

## Файлы и медиа

Файлы обрабатывает `FilesModule`.

Хранилище: MinIO, приватный bucket `globoatlas-files`.

Загрузка:

- изображения PNG/JPEG/GIF/WebP проходят через `sharp`;
- обычные изображения пересохраняются в JPEG, EXIF удаляется, длинная сторона ограничивается 2000 px;
- для изображений создается preview до 400 px;
- GIF сохраняется как есть, preview создается по первому кадру;
- видео/PDF/документы сохраняются без изменения.

Выдача файлов идет через authenticated endpoint `/api/files/:filename`, а не напрямую из MinIO.

## Чаты и real-time

Чаты реализованы двумя способами:

- REST API для получения комнат и сообщений;
- Socket.IO gateway для real-time доставки.

WebSocket:

- клиент подключается с JWT;
- backend проверяет токен в handshake;
- пользователь может `joinRoom` только если он участник комнаты;
- отправка сообщений rate-limited: 30 сообщений за 10 секунд на пользователя;
- новое сообщение рассылается событием `newMessage` в комнату.

Nginx отдельно проксирует `/socket.io/` с `Upgrade` и `Connection: upgrade`.

## AI

AI-модуль отвечает за генерацию короткого текста наблюдения.

Поддерживается конфигурация через env:

- `AI_PROVIDER=stub` — безопасный шаблон без внешней модели;
- `AI_PROVIDER=gemma` или `openai-compat` — OpenAI-compatible endpoint, например vLLM/Ollama/llama.cpp;
- `AI_API_URL`;
- `AI_API_KEY`;
- `AI_MODEL`.

Если AI endpoint недоступен или не настроен, сервис возвращает fallback-текст, чтобы интерфейс не ломался.

## Web-приложение

Web находится в `web/` и построен на:

- Next.js 14 App Router;
- React 18;
- TypeScript;
- Tailwind CSS;
- Axios;
- Socket.IO client;
- Recharts;
- lucide-react.

Точка входа layout: `web/app/layout.tsx`.

Глобально подключены:

- шрифт Nunito с latin/cyrillic;
- `AuthProvider`;
- `globals.css`.

API-клиент: `web/lib/api.ts`.

Особенности web-клиента:

- `baseURL` строится как `${API_URL}/api`;
- access token добавляется в `Authorization`;
- при `401` выполняется refresh token flow;
- параллельные запросы во время refresh ставятся в очередь;
- при неуспешном refresh пользователь отправляется на `/login`.

Routing и роли:

- `middleware.ts` читает `token` и `role` из cookie;
- публичные пути: `/login`, `/invite`;
- `/` редиректит на домашний раздел роли;
- role-based доступ:
  - admin: `/admin`;
  - teacher: `/teacher`;
  - parent: `/parent`;
  - psychologist: `/psychologist`;
  - pediatrician: `/pediatrician`;
  - общие: `/profile`, `/notifications`.

Основные web-разделы:

- `/admin` — админ-панель;
- `/admin/groups`, `/admin/children`, `/admin/parents`, `/admin/staff`, `/admin/skills`, `/admin/attendance`, `/admin/payments`, `/admin/reports`, `/admin/menu`, `/admin/events`, `/admin/broadcasts`, `/admin/knowledge`;
- `/teacher` — педагогический кабинет, расписание, чаты, портфолио, дневник, задания, heatmap, feed;
- `/parent` — родительский кабинет, расписание, меню, feed, diary, progress, attendance, payments, appointments, knowledge, chats, community, about;
- `/psychologist` и `/pediatrician` — кабинеты специалистов, children, slots, recommendations, chats;
- `/invite` — принятие приглашения;
- `/login` — вход.

UI разбит на компоненты:

- layout/navigation: `PageLayout`, `AppSidebar`, `ChatsLayout`;
- auth/media: `AuthMedia`, `PostMedia`, `VideoEmbed`, `Lightbox`;
- business components: `ChildWizard`, `ChildProfileCard`, `ObservationPostWizard`, `RecommendationsManager`, `SlotsManager`, `MenuManager`, `StaffPicker`, `InviteShareModal`;
- basic UI: `Button`, `Card`, `Badge`, `PageTitle`, `SectionLabel`, `StatTile`.

## Mobile-приложение

Mobile находится в `mobile/` и построен на:

- Expo 54;
- React Native 0.81;
- React 19;
- Expo Router 6;
- TypeScript;
- Axios;
- Socket.IO client;
- Expo Secure Store;
- Expo Image Picker.

Точка входа: `mobile/app/_layout.tsx`.

Навигация:

- `login`;
- `(tabs)` — основные вкладки;
- `new-post` как modal screen;
- отдельные parent/admin/child экраны.

API-клиент: `mobile/lib/api.ts`.

Особенности:

- в dev API URL вычисляется из Expo host URI и указывает на порт `3001`;
- в production используется `EXPO_PUBLIC_API_URL`, `extra.apiUrl` или fallback `https://your-domain.ru`;
- access token добавляется к каждому запросу;
- refresh flow аналогичен web;
- media URL может получать token query param через `getAuthMediaUrl`.

Expo config: `mobile/app.json`.

Пакеты приложения:

- iOS bundle id: `com.globokids.atlas`;
- Android package: `com.globokids.atlas`;
- scheme: `globoatlas`.

## Инфраструктура и деплой

Основной production/development контур описан в `docker-compose.yml`.

Сервисы:

- `postgres` — PostgreSQL 16, база `globoatlas`, порт наружу `127.0.0.1:55432`;
- `redis` — Redis 7 alpine;
- `minio` — object storage, API `127.0.0.1:9000`, console `127.0.0.1:9001`;
- `backend` — NestJS API, порт `127.0.0.1:3001`;
- `web` — Next.js standalone, порт `0.0.0.0:3000`;
- `nginx` — reverse proxy, порты `8080:80` и `8443:443`.

Volumes:

- `pgdata`;
- `redisdata`;
- `miniodata`.

Backend Dockerfile:

- builder ставит зависимости, генерирует Prisma client, собирает Nest;
- runner ставит production dependencies;
- при старте применяет migrations, если они есть, иначе `prisma db push`;
- если пользователей нет, запускает seed;
- стартует `node dist/src/main`.

Web Dockerfile:

- собирает Next.js в `standalone` режиме;
- запускает `node server.js` от пользователя `nextjs`;
- build-time аргументы: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`.

Nginx:

- содержит HTTP server на 80;
- HTTPS-блок подготовлен, но закомментирован;
- добавлены базовые security headers;
- `client_max_body_size 50M`;
- для API увеличены timeouts до 120 секунд.

## Переменные окружения

Шаблоны:

- `.env.example`;
- `.env.production.example`.

Основные переменные:

- `DB_USER`, `DB_PASSWORD`;
- `JWT_SECRET`;
- `MINIO_USER`, `MINIO_PASSWORD`;
- `CORS_ORIGINS`;
- `NEXT_PUBLIC_API_URL`;
- `PUBLIC_APP_URL`;
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`;
- `AI_PROVIDER`, `AI_API_URL`, `AI_API_KEY`, `AI_MODEL`.

В production важно заменить все `CHANGE_ME...`, сгенерировать сильные секреты и указать реальные домены.

## Локальный запуск

Через Docker:

```bash
cd globoatlas
docker compose up -d --build
```

После первого старта:

```bash
docker compose exec backend npx prisma db push
docker compose exec backend npx prisma db seed
```

Отдельно backend:

```bash
cd globoatlas/backend
npm install
npm run start:dev
```

Отдельно web:

```bash
cd globoatlas/web
npm install
npm run dev
```

Отдельно mobile:

```bash
cd globoatlas/mobile
npm install
npm run start
```

## Тесты и качество

Backend содержит:

- unit test script: `npm run test`;
- e2e test script: `npm run test:e2e`;
- coverage: `npm run test:cov`;
- e2e config: `backend/test/jest-e2e.json`.

Web:

- `npm run build`;
- `npm run lint`, но в `next.config.mjs` ESLint отключен на production build через `ignoreDuringBuilds: true`;
- TypeScript ошибки должны ловиться на build.

Mobile:

- отдельных test scripts нет;
- проверка обычно идет через Expo start/android/ios/web.

## Важные наблюдения по текущему состоянию

- В проекте нет единого root `package.json`; backend, web и mobile живут как отдельные npm-проекты.
- В корне `D:\App\22kids` не обнаружен git-репозиторий, поэтому состояние изменений git-командами из корня не отслеживается.
- В `DEPLOY.md`, `.env.example`, `.env.production.example`, `schema.prisma` и некоторых исходниках видны признаки текста, поврежденного кодировкой при просмотре в консоли. Логика кода при этом читается, но русские строки лучше привести к корректному UTF-8 при отдельной задаче.
- Redis присутствует в `docker-compose.yml` и зависимости backend содержат Bull, но по прочитанной структуре активная бизнес-логика в основном работает через PostgreSQL, MinIO и Socket.IO.
- В `backend/prisma` есть несколько вспомогательных скриптов для seed/reset/merge/import, что указывает на ручное обслуживание данных и импорт матрицы навыков.

## Краткая карта ответственности

```text
backend/src/auth          вход, сессии, приглашения
backend/src/admin         управление справочниками и админ-операциями
backend/src/children      ребенок как центральная сущность: прогресс, заметки, задания
backend/src/feed          публикации и лента
backend/src/chats         комнаты, сообщения, WebSocket
backend/src/files         MinIO, загрузка, thumbnails
backend/src/activities    меню, события, рассылки
backend/src/kb            база знаний
backend/src/appointments  записи к специалистам
backend/prisma            модель данных, seed и служебные scripts
web/app                   страницы Next.js
web/components            reusable UI и бизнес-компоненты
web/lib                   API-клиент, типы, helpers
mobile/app                экраны Expo Router
mobile/lib                API, auth, theme, типы
nginx                     reverse proxy
```
