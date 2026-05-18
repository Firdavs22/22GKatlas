# Mobile · Сборка и публикация (Android + iOS)

Один код Expo Router — два целевых магазина. Сборка отличается из-за требований Apple/Google и санкций РФ-разработчикам.

---

## Подготовка (одинаково для обоих)

```bash
cd mobile
npm install
```

Если ещё нет — установить EAS CLI:

```bash
npm i -g eas-cli
eas login   # email + пароль от Expo (https://expo.dev)
eas init    # один раз — связать с проектом на expo.dev
```

В `mobile/app.json` уже прописаны:
- `bundleIdentifier: com.globokids.atlas` (iOS)
- `package: com.globokids.atlas` (Android)
- Permission strings под камеру / галерею / микрофон
- Иконки и splash

---

## 🤖 Android

### Локальный APK для теста

```bash
cd mobile
eas build --platform android --profile preview --local
```

Файл `.apk` появится в текущей директории. Распространять напрямую (Telegram-канал, сайт сада) — устанавливается «из неизвестных источников».

Или без EAS, через классический Expo prebuild:

```bash
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
# apk: android/app/build/outputs/apk/release/app-release.apk
```

### Публикация в RuStore

- Регистрация на rustore.ru → требуется **юр.лицо или ИП**
- Загрузить подписанный APK через консоль разработчика
- Модерация — обычно 1-3 дня
- **Бесплатно**

### Публикация в Google Play

- Google Developer Account — **$25 разово**
- С 2022 для РФ-разработчиков напрямую недоступен, нужен **прокси-юрлицо** (Казахстан, Армения, Грузия)
- Альтернатива — попросить partner-юрлицо опубликовать
- AAB-формат: `eas build --platform android --profile production`

---

## 🍏 iOS

### Главная сложность для РФ

С 2022 года **Apple не выдаёт новые Developer-аккаунты разработчикам из РФ**. Существующие аккаунты до санкций — продолжают работать. Варианты:

| Вариант | Цена | Сложность |
|---|---|---|
| Существующий Apple Developer аккаунт | $99/год (продлевать через прокси-карту) | Просто |
| Прокси-юрлицо (Казахстан/Грузия) — открыть Apple Developer | $99/год + услуги | Средне |
| **TestFlight** (бета-канал) — для теста на устройствах сотрудников/родителей | Только Apple Dev аккаунт | Просто после оформления |
| Без Apple Dev — нет |  |  |

### EAS Build (рекомендую — без Mac)

Самый простой путь — облачная сборка Expo. Не нужен Mac.

```bash
cd mobile

# Один раз — настроить credentials
eas credentials       # выбрать ios, ввести Apple ID, EAS подготовит сертификаты автоматически

# Сборка
eas build --platform ios --profile preview      # для TestFlight + ad-hoc
eas build --platform ios --profile production   # для App Store
```

Результат — `.ipa` файл в облаке Expo + ссылка на скачивание + автоматическая отправка в TestFlight (если указать `--auto-submit`).

### Локальная сборка (нужен Mac)

```bash
npx expo prebuild --platform ios
cd ios && pod install
open globoatlas.xcworkspace
# Archive → Validate → Distribute
```

Только с настоящим Mac + Xcode (есть `xcrun` и signing-цепочка).

### Публикация в App Store

1. Создать запись приложения в **App Store Connect** (appstoreconnect.apple.com)
2. Заполнить: описание, скриншоты (требуют 6.7", 5.5", iPad), privacy policy URL, age rating (4+)
3. Загрузить `.ipa` через EAS или Transporter
4. Подача на review — **обычно 1-2 дня**
5. **Срок жизни review** — Apple может запросить демо-аккаунт (вы создаёте test-учётку и указываете в metadata)

**Ключевое:** Apple требует URL политики конфиденциальности → у нас уже есть `/privacy` ✓ (заполнить юр. текст до подачи).

### Sideload без App Store (для пилота на ~20 устройств)

- **TestFlight** — официально. До 10 000 тестеров. Срок жизни сборки — 90 дней.
- **Ad-Hoc распространение** — до 100 устройств. Каждый UDID добавляется в провижн.

---

## eas.json — конфиг сборки

Если файла нет в `mobile/`, создать:

```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "ios": { "simulator": false }
    },
    "production": {
      "android": { "buildType": "app-bundle" },
      "ios": {}
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your@email.com",
        "ascAppId": "1234567890"
      }
    }
  }
}
```

`eas init` создаст шаблон автоматически.

---

## Что задать в `.env` мобилки

```ini
# В production использовать боевой бэкенд
EXPO_PUBLIC_API_URL=https://app.example.com
```

Передаётся через `extra` в `app.json` или в момент сборки:

```bash
EXPO_PUBLIC_API_URL=https://app.example.com eas build --platform ios --profile production
```

В dev (Expo Go) — оставить пустым, фоллбэк через `api-proxy.js` подцепится автоматом.

---

## Чек-лист перед публикацией

- [ ] `mobile/lib/api.ts:30` — заменить `https://your-domain.ru` на реальный домен
- [ ] `mobile/app.json` → версии: `version`, `ios.buildNumber`, `android.versionCode` ↑ при каждом релизе
- [ ] Тест на реальном устройстве (Android физ. + iOS симулятор/TestFlight)
- [ ] Скриншоты для App Store / RuStore (3-5 шт на каждое разрешение)
- [ ] Privacy URL указывает на `/privacy` уже наполненный юр. текстом
- [ ] Подача в магазины
- [ ] Тест-аккаунт для review (для Apple)

---

## Полезные команды

```bash
# Очистить кэш Metro если глючит
npx expo start --clear

# Обновить Expo SDK
npx expo install --check

# Текущий статус сборок
eas build:list

# Подача в магазины из EAS
eas submit --platform ios --latest
eas submit --platform android --latest
```
