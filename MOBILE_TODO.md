# Mobile (Expo / React Native) — что осталось

Аудит относительно веб-версии. Mobile сейчас ~30% покрытия.

## Уже есть
- `(tabs)` shell: home, progress, feed, post, chats, profile
- `parent/`: attendance, payments, progress, schedule
- `admin/index.tsx`, `child/[id].tsx`, `login.tsx`, `new-post.tsx`
- Auth, navigation, базовая дизайн-система (`components/ui/*`, `lib/theme`)

## Архитектура — что уже решено

- **Routing:** Expo Router file-based, role-gated через `ROLE_TABS` в `(tabs)/_layout.tsx`
- **API:** `axios` с baseURL из `lib/network`, ровно как на web
- **WebSocket:** `socket.io-client` для чатов уже стоит
- **Storage:** `expo-secure-store` для JWT
- **Images:** `expo-image-picker`

Так что **переписывать ничего не надо** — только дополнить экраны.

## Какие экраны строить (по приоритету)

### Приоритет 1 — Parent (главный пользователь приложения)
Большинство родителей будут заходить с телефона. Эти экраны критичны:

| Экран | Веб-аналог | Сложность | Файл для создания |
|---|---|---|---|
| Лента (детальный пост + лайтбокс) | `/parent/feed/[id]` | низкая | `app/parent/feed/[id].tsx` |
| Меню питания | `/parent/menu` | низкая | `app/parent/menu.tsx` |
| Рекомендации (home-tasks) | `/parent/home-tasks` | средняя | `app/parent/home-tasks.tsx` |
| Запись на приём | `/parent/appointments` | средняя | `app/parent/appointments.tsx` |
| База знаний (KB) | `/parent/knowledge` | низкая | `app/parent/knowledge.tsx` + `[id].tsx` |
| О системе (зоны/стадии) | `/parent/about` | низкая | `app/parent/about.tsx` |
| Drill-down по измерению | `/parent/progress/dimension/[key]` | средняя | `app/parent/progress/dimension/[key].tsx` |
| Дневник наблюдений | `/parent/diary` | средняя | `app/parent/diary.tsx` |

### Приоритет 2 — Teacher
Учителя в основном работают в саду с планшета. Минимум нужен:

| Экран | Веб-аналог | Сложность | Файл |
|---|---|---|---|
| Список детей группы | `/teacher` (главная) | низкая | `app/teacher/index.tsx` |
| Матрица прогресса | `/teacher` heatmap-like | **высокая** (нужны жесты + большая сетка) | `app/teacher/progress.tsx` |
| Тепловая карта | `/teacher/heatmap` | средняя | `app/teacher/heatmap.tsx` |
| Дневник | `/teacher/diary` | средняя | `app/teacher/diary.tsx` |
| Портфолио | `/teacher/portfolio` | средняя | `app/teacher/portfolio.tsx` |
| Расписание | `/teacher/schedule` | средняя | `app/teacher/schedule.tsx` |
| Рекомендации (выдача) | `/teacher/home-tasks` | средняя | `app/teacher/home-tasks.tsx` |

### Приоритет 3 — Specialists (psy + ped)
Реже заходят в моб. версию, но базовый функционал нужен:

| Экран | Веб-аналог | Сложность | Файл |
|---|---|---|---|
| Список своих детей | `/psychologist`, `/pediatrician` | низкая | `app/(role)/index.tsx` |
| Рекомендации | `/recommendations` | средняя | `app/(role)/recommendations.tsx` |
| Слоты приёма | `/slots` | средняя | `app/(role)/slots.tsx` |

### Приоритет 4 — Admin
Админам мобилка нужна минимально (быстро посмотреть статус, послать ответ). Делать в последнюю очередь:

- Группы list (`app/admin/groups.tsx`) — read-only
- Дети (`app/admin/children.tsx`) — read-only
- Сотрудники (`app/admin/staff.tsx`) — read-only
- События (`app/admin/events.tsx`) — read + create
- Рассылки (`app/admin/broadcasts.tsx`) — отправка

Остальное (skills, payments, reports) — оставляй для веба, на телефоне это никто не редактирует.

## Технические рекомендации

### Шаблон экрана

Используй уже существующий `MobileShell` / `Card` / `Button`. Не плоди новые компоненты для каждого экрана — переиспользуй.

```tsx
import MobileShell from '../../components/MobileShell';
import { Card } from '../../components/ui/Card';
import api from '../../lib/api';

export default function MyScreen() {
  const [data, setData] = useState([]);
  useEffect(() => { api.get('/endpoint').then(r => setData(r.data)); }, []);
  return (
    <MobileShell title="Заголовок">
      {data.map(item => <Card key={item.id}>...</Card>)}
    </MobileShell>
  );
}
```

### Что переиспользовать из веба

- API endpoints — **те же** (`/api/feed`, `/api/children/:id/progress`, и т.д.)
- Типы — можно скопировать `web/lib/types.ts` → `mobile/lib/types.ts`
- Логику отображения стадий/дат/имён — копируй helper-функции один-в-один

### Чего избегать

- **Не используй `font-serif`** в стилях — Nunito везде (на вебе мы это утвердили).
- **Не кэшируй JWT в AsyncStorage** — только в `expo-secure-store` (это уже сделано).
- **Не дублируй валидацию** — бэкенд всё проверяет (DTO добавлены в спринте безопасности).

### Что станет проще после Спринта 1

Когда будет готов `/auth/forgot-password` (это я делаю сейчас на бэке), на мобилке тоже надо будет добавить две формы: `forgot.tsx` (ввести email) и `reset.tsx` (ввести новый пароль по deep-link токену). Я тебе напишу когда endpoint будет готов.

## Тестирование

Запуск локально (на твоём компе через Expo Go):

```bash
cd mobile
npm install
npx expo start
# Сканировать QR с телефона через Expo Go
```

API должен смотреть на тот же бэкенд, что и веб:
- `.env` или `app.json` → `EXPO_PUBLIC_API_URL=http://192.168.1.X:3001` (твой локальный IP)

Когда будет домен — `EXPO_PUBLIC_API_URL=https://app.example.com`.

## Когда выкладывать в магазины

- **RuStore** — основной для РФ, бесплатно. Подача через rustore.ru → требуется юр.лицо
- **Google Play** — $25 разово, но РФ-разработчикам сейчас можно через прокси-юрлицо
- **App Store** — $99/год, нужен Apple Developer Account, аккаунт можно открыть из РФ через сторонние сервисы

Для пилота РустОр + APK через сайт (для Android) хватит. iOS можно отложить.

## Что НЕ делать на мобилке

Эти экраны лучше оставить только в web, на мобилке только ссылка «Открыть в браузере»:

- Админка целиком (кроме мониторинга и быстрых действий)
- Импорт навыков из Excel
- Сложные отчёты с графиками
- Site-content редактор
