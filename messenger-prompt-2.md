# 📱 ПРОМТ ДЛЯ РАЗРАБОТКИ МЕССЕНДЖЕРА «MIRA»

## 🧠 ИНСТРУКЦИЯ ДЛЯ ИИ — ЧИТАТЬ ПЕРВЫМ

Ты — senior full-stack разработчик. Твоя задача — создать мессенджер **MIRA** («Мирка»).

**ВАЖНО: Работай строго поэтапно. Каждый этап — отдельная задача. Не переходи к следующему этапу, пока текущий не завершён и не проверен. После завершения каждого этапа — сообщи что сделано, покажи что работает, и жди команды «продолжай».**

**Платформа:** единое веб-приложение (**PWA** — Progressive Web App), которое:
- На ПК выглядит и работает как полноценный десктопный мессенджер
- На телефоне адаптируется в нативный мобильный интерфейс
- Устанавливается на домашний экран телефона с браузера (как нативное приложение)
- Никакого React Native, никакого Expo — только один React-проект

Дизайн: гибрид стиля **Apple** (минимализм, стекло, SF Pro, плавные анимации, закруглённые углы) и **Telegram** (компактность, функциональность, пузыри сообщений). Звонки и видеозвонки — не нужны.

---

## 🛠 ТЕХНОЛОГИЧЕСКИЙ СТЕК

### Frontend — PWA (единое приложение для ПК и мобилы)
- **React 18** + **TypeScript**
- **Vite** (сборщик) + **vite-plugin-pwa** — генерация Service Worker и Web App Manifest
- **Tailwind CSS** + кастомные CSS переменные
- **Framer Motion** — анимации
- **Zustand** + **zustand/middleware/persist** — глобальный стейт с кэшем
- **React Router v6**
- **date-fns** — форматирование дат
- **emoji-mart** — emoji picker
- **@giphy/react-components** — GIF picker (бесплатный Giphy API)
- **react-dropzone** — загрузка файлов/фото drag & drop (desktop)
- **wavesurfer.js** — визуализация волны голосовых сообщений
- **i18next** + **react-i18next** + **i18next-browser-languagedetector** — RU / EN

### Backend
- **Node.js** + **Fastify** + **TypeScript**
- **Socket.IO** — реал-тайм: сообщения, статусы, typing
- **Firebase Admin SDK** — верификация JWT токенов
- **PocketBase** — основная БД + **файловое хранилище для медиа** (фото, аудио, аватарки — всё хранится в PocketBase, никакого Cloudinary)
- **Web Push** (`web-push` npm) — push-уведомления через VAPID
- **open-graph-scraper** (npm) — парсинг мета-тегов для превью ссылок

---

## 📲 PWA — УСТАНОВКА КАК ПРИЛОЖЕНИЕ

Это ключевая особенность MIRA — пользователь устанавливает мессенджер на телефон прямо из браузера, без App Store и Google Play.

### Web App Manifest (`manifest.webmanifest`):
```json
{
  "name": "MIRA Messenger",
  "short_name": "MIRA",
  "description": "Мессенджер MIRA",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#000000",
  "theme_color": "#007AFF",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "screenshots": [
    { "src": "/screenshots/mobile.png", "sizes": "390x844", "type": "image/png", "form_factor": "narrow" },
    { "src": "/screenshots/desktop.png", "sizes": "1280x800", "type": "image/png", "form_factor": "wide" }
  ],
  "categories": ["social", "communication"]
}
```

### vite-plugin-pwa конфигурация:
```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa'

VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['icons/*.png', 'screenshots/*.png'],
  manifest: { /* см. выше */ },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/api\./,
        handler: 'NetworkFirst',
        options: { cacheName: 'api-cache', networkTimeoutSeconds: 5 }
      }
    ]
  }
})
```

### Баннер «Установить MIRA»:
- Слушать событие `beforeinstallprompt` (Android Chrome / Edge)
- Показывать кастомный баннер снизу экрана (не стандартный браузерный):
  - Иконка MIRA + текст «Установить как приложение» + кнопка «Установить»
  - Если пользователь отклонил — не показывать 30 дней (запомнить в localStorage)
- На iOS Safari — показывать инструкцию: «Нажмите **Поделиться** → **На экран "Домой"**» с анимированной стрелкой
- После установки — скрыть баннер, показать уведомление «MIRA установлена ✓»

### Определение iOS:
```typescript
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches
// Показывать инструкцию только на iOS и только если ещё не установлено
if (isIOS && !isInStandaloneMode) showIOSInstallGuide()
```

### Поддержка `display: standalone`:
- Когда приложение установлено и открыто — убрать адресную строку браузера
- Настроить `safe-area-inset` для iPhone с чёлкой:
```css
.app-container {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
```

---

## 📐 АДАПТИВНЫЙ ДИЗАЙН — ПК И МОБИЛА

Единое приложение, но два разных лейаута в зависимости от ширины экрана.

### Брейкпоинты:
```typescript
const MOBILE_BREAKPOINT = 768  // px
const useIsMobile = () => useMediaQuery('(max-width: 768px)')
```

### Лейаут ПК (≥ 768px) — Telegram Desktop стиль:
```
┌──────────────────────────────────────────────────────┐
│  [MIRA]  [🔍 Поиск]                [⚙️] [Профиль]   │ ← Header (glass)
├─────────────────┬────────────────────────────────────┤
│                 │  [Имя чата]  [🔍]  [ℹ️]            │
│  Список чатов   │                                    │
│  (280px)        │         Сообщения                  │
│                 │                                    │
│  [Ava] Чат 1    │   [Ava] Имя  12:34                 │
│  [Ava] Чат 2    │   ╭──────────────────╮             │
│  [Ava] Чат 3    │   │  Привет! Как?    │             │
│   ...           │   ╰──────────────────╯             │
│                 │         ╭──────────────────────╮   │
│                 │         │  Хорошо, спасибо! ✓✓ │   │
│                 │         ╰──────────────────────╯   │
│                 │  ──────────────────────────────    │
│                 │  [😊][📎][🎤]  [Напишите...]  [➤] │
└─────────────────┴────────────────────────────────────┘
```

### Лейаут мобилы (< 768px) — iMessage / Telegram Mobile стиль:

**Экран 1 — Список чатов (главный экран):**
```
┌─────────────────────┐
│  MIRA          [✏️] │  ← Header с кнопкой «Новый чат»
│  ─────────────────  │
│  [🔍 Поиск...]      │
│  ─────────────────  │
│  [Ava] Имя          │
│       Привет! Как   │
│       12:34  [3]    │
│  ─────────────────  │
│  [Ava] Группа       │
│       Фото          │
│       Вчера  [1]    │
│  ...                │
│                     │
│  ─────────────────  │
│  [💬]  [🔍]  [👤]  │  ← Bottom tab bar
└─────────────────────┘
```

**Экран 2 — Чат (открывается на весь экран, список скрывается):**
```
┌─────────────────────┐
│  [←] [Ava] Имя  [ℹ]│  ← Navigation bar (назад + инфо)
│  ─────────────────  │
│   [Ava] 12:34       │
│   ╭───────────╮     │
│   │ Привет!   │     │
│   ╰───────────╯     │
│         ╭────────╮  │
│         │ Привет │  │
│         │ ✓✓  💙 │  │
│         ╰────────╯  │
│                     │
│  ─────────────────  │
│  [😊][📎] [Текст] [➤]│ ← Input bar (прилипает к клавиатуре)
└─────────────────────┘
```

### Навигация на мобиле:
- **Bottom tab bar**: Чаты / Поиск / Профиль — всегда виден на главном экране
- При открытии чата — tab bar скрывается, появляется navigation bar с кнопкой «Назад»
- **Swipe back**: свайп вправо по экрану чата → вернуться к списку
- Реализовать через React Router + CSS transition (slide): открытие чата = slide left, закрытие = slide right
- **Pull-to-refresh** на списке чатов (CSS overscroll + touch events)

### Тач-жесты на мобиле:
- **Long press** на сообщении (500ms) → контекстное меню (вместо правой кнопки)
- **Swipe left** по чату в списке → показать кнопки «Архив» / «Удалить»
- **Swipe right** → «Закрепить вверху»
- Голосовые: **tap & hold** кнопки микрофона → запись; **свайп вверх** → фиксировать запись; **свайп влево** → отменить

### Мобильная клавиатура:
- При открытии клавиатуры — поле ввода прилипает к клавиатуре (не перекрывается)
- Реализовать через `visualViewport API`:
```typescript
window.visualViewport?.addEventListener('resize', () => {
  const height = window.visualViewport?.height ?? window.innerHeight
  inputBar.style.bottom = `${window.innerHeight - height}px`
})
```

### Размеры тапабельных элементов:
- Минимум **44×44px** для всех кнопок на мобиле (стандарт Apple HIG)
- Пузыри сообщений — достаточно широкие для удобного long press
- Кнопки в input bar на мобиле крупнее чем на десктопе

---

## 🗄 СХЕМА БАЗЫ ДАННЫХ (PocketBase)

### Коллекции:

**users**
```
id, email, displayName, avatarUrl, bio, lastSeen, isOnline,
language (ru | en), createdAt
```

**user_devices**
```
id, userId, pushSubscription (JSON — полный объект Web Push subscription),
userAgent, createdAt, lastActiveAt
```
> ⚠️ Отдельная коллекция для устройств. Один пользователь = много устройств (телефон + ПК + планшет).
> При логине на новом устройстве — **добавлять** новую запись (не перезаписывать!).
> При логауте или ошибке push (статус 410 Gone) — **удалять** запись.
> Бэкенд при отправке уведомления: `SELECT * FROM user_devices WHERE userId = X` → отправлять пуш **в цикле** на все устройства.

**chats**
```
id, type (direct | group), name, avatarUrl, createdBy, createdAt,
pinnedMessageId, description, isArchived
```

**chat_members**
```
id, chatId, userId, role (owner | admin | member),
joinedAt, isMuted, notificationsEnabled
```

**messages**
```
id, chatId, senderId,
type (text | image | audio | gif | sticker | system),
content, fileUrl, fileName, fileSize,
duration (секунды, только для audio),
linkPreview (JSON: { url, title, description, imageUrl, siteName }),
replyToId, forwardedFromId, forwardedFromChatId,
isEdited, isDeleted, editedAt, createdAt
```

**message_reads**
```
id, chatId, userId, lastReadMessageId, readAt
```
> ⚠️ Одна запись на пользователя на чат (upsert). Не per-message.

**reactions**
```
id, messageId, userId, emoji, createdAt
```

---

## 🔒 БЕЗОПАСНОСТЬ POCKETBASE — API RULES (RLS)

**ОБЯЗАТЕЛЬНО настроить. Без этого база данных открыта всем.**

### `messages`:
```javascript
// List/View — только чаты, где пользователь участник
@request.auth.id != "" &&
chatId.id ~ @collection.chat_members[userId = @request.auth.id].chatId

// Create — только в своих чатах
@request.auth.id != "" &&
@collection.chat_members[userId = @request.auth.id && chatId = chatId].id != ""

// Update — только автор
@request.auth.id = senderId

// Delete — автор или admin/owner
@request.auth.id = senderId ||
@collection.chat_members[userId = @request.auth.id && chatId = chatId && role = "admin"].id != "" ||
@collection.chat_members[userId = @request.auth.id && chatId = chatId && role = "owner"].id != ""
```

### `chat_members`:
```javascript
// List/View — свои записи или записи своих чатов
@request.auth.id != "" &&
(@request.auth.id = userId ||
chatId ~ @collection.chat_members[userId = @request.auth.id].chatId)
// Create — только через бэкенд (серверный токен)
// Update/Delete — только owner/admin
```

### `users`:
```javascript
// List/View — любой авторизованный (для поиска)
@request.auth.id != ""
// Update — только сам пользователь
@request.auth.id = id
```

### `reactions`:
```javascript
// Delete — только автор реакции
@request.auth.id = userId
```

---

## 🔐 АВТОРИЗАЦИЯ

### Google OAuth через Firebase Auth:
1. Кнопка «Войти через Google» — `signInWithPopup` (всегда web, popup работает и на мобильном браузере)
2. Получить `idToken` из Firebase
3. POST `/auth/google` на бэкенд → верификация Firebase Admin SDK
4. Бэкенд: upsert пользователя в PocketBase, вернуть JWT сессии
5. JWT хранить в `localStorage`
6. HOC `<RequireAuth>` — защищённые роуты
7. Тихая авторизация при перезапуске

---

## 💬 ФУНКЦИОНАЛ СООБЩЕНИЙ

### Типы сообщений:
- ✉️ **Текст** — markdown, ссылки кликабельны
- 📷 **Фото** — сжатие до 1920px, превью, лайтбокс
- 🎤 **Голосовое** — `MediaRecorder API`, формат `audio/webm;codecs=opus`, wavesurfer.js
- 😊 **Emoji** — emoji-mart picker
- 🎬 **GIF** — Giphy picker
- 🔗 **Превью ссылки** — автоматически, парсинг на бэкенде
- 🔁 **Пересланное** — с указанием автора и чата
- ↩️ **Ответ** — с цитатой
- 🖼 **Системное** — «пользователь добавлен», «чат создан»

### Статусы сообщений:
- ⏳ Pending (нет сети, ожидает отправки)
- ✓ Отправлено на сервер
- ✓✓ серые — доставлено
- ✓✓ синие — прочитано

### Синхронизация прочтения:
> ⚠️ **Один запрос `mark_read_batch` при открытии чата** с `lastMessageId`. Upsert в `message_reads`. Никаких per-message запросов.

```typescript
socket.emit('mark_read_batch', { chatId: string, lastMessageId: string })
```

### Действия с сообщением:
- **Desktop**: правая кнопка мыши → контекстное меню
- **Mobile**: long press (500ms) → контекстное меню с анимацией (как в iMessage)
- Действия: Ответить / Переслать / Копировать / Реакция / Редактировать / Удалить / Закрепить / Информация

---

## 🎤 ГОЛОСОВЫЕ СООБЩЕНИЯ

- **Платформа**: `MediaRecorder API`, формат **`audio/webm;codecs=opus`** (работает в Chrome и Firefox на всех устройствах, включая Android)
- **iOS Safari**: fallback на `audio/mp4` (AAC), т.к. Safari не поддерживает WebM. Определять через `MediaRecorder.isTypeSupported()`
- Загружать **в PocketBase** через встроенный file upload API (POST `/api/collections/messages/records` с multipart/form-data)
- Хранить: `fileUrl` (относительный путь PocketBase), `duration` (сек), `fileSize`

```typescript
const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
  ? 'audio/webm;codecs=opus'
  : 'audio/mp4'
const recorder = new MediaRecorder(stream, { mimeType })
```

> ✅ PocketBase хранит файлы локально (или в S3 если нужно масштабироваться) — бесплатно, без внешних зависимостей, без лимитов стороннего сервиса.

---

## 🔗 ПРЕВЬЮ ССЫЛОК

1. Бэкенд при получении `text` сообщения — regex для URL
2. `open-graph-scraper` → `{ title, description, imageUrl, siteName }`
3. Сохранить в `linkPreview` JSON, отправить `message_link_preview_ready` через Socket
4. Клиент: компонент `LinkPreviewCard` — картинка + заголовок + домен

---

## 🔌 OFFLINE-РЕЖИМ (Service Worker + IndexedDB)

- Service Worker (через vite-plugin-pwa / Workbox) кэширует статику и API
- При потере сети: сообщение → IndexedDB `outbox` со статусом ⏳
- При восстановлении (`online` event + SW sync): отправить `outbox` по порядку
- `offlineStore` (Zustand): `addToQueue()`, `processQueue()`, `removeFromQueue()`
- При ошибке — кнопка «Повторить» под сообщением

```typescript
interface PendingMessage {
  localId: string
  chatId: string
  content: string
  type: MessageType
  replyToId?: string
  createdAt: string
  status: 'pending'
}
```

---

## ⚙️ REAL-TIME (Socket.IO)

```typescript
// Клиент → Сервер
join_chat(chatId)
leave_chat(chatId)
send_message(chatId, messageData)
typing_start(chatId)
typing_stop(chatId)
mark_read_batch(chatId, lastMessageId)
update_presence()  // каждые 30 сек

// Сервер → Клиент
new_message(message)
message_updated(message)
message_deleted(messageId, chatId)
message_link_preview_ready(messageId, linkPreview)
user_typing(chatId, userId)
user_stopped_typing(chatId, userId)
messages_read(chatId, userId, lastMessageId)
user_online(userId)
user_offline(userId, lastSeen)
reaction_added(messageId, reaction)
reaction_removed(messageId, reactionId)
```

---

## 🔔 PUSH-УВЕДОМЛЕНИЯ (Web Push)

Поскольку это PWA (нет нативного приложения), используется **Web Push API** — работает в браузере и в установленном PWA на Android и iOS 16.4+.

### Реализация (мульти-устройства):
```typescript
// 1. Клиент: получить подписку и отправить на бэкенд
const registration = await navigator.serviceWorker.ready
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: VAPID_PUBLIC_KEY
})
// POST /api/devices — сохранить в коллекцию user_devices (добавить, не перезаписать!)
await api.post('/devices', { pushSubscription: JSON.stringify(subscription), userAgent: navigator.userAgent })
```

### Бэкенд отправляет push на ВСЕ устройства пользователя:
```typescript
import webpush from 'web-push'
webpush.setVapidDetails(subject, PUBLIC_KEY, PRIVATE_KEY)

// Получить все устройства получателя
const devices = await pb.collection('user_devices').getFullList({ filter: `userId = "${recipientId}"` })

// Отправить пуш в цикле на каждое устройство
for (const device of devices) {
  try {
    const subscription = JSON.parse(device.pushSubscription)
    await webpush.sendNotification(subscription, JSON.stringify({
      title: senderName,
      body: messagePreview,
      icon: senderAvatarUrl,
      badge: '/icons/badge-72.png',
      data: { chatId }
    }))
  } catch (err: any) {
    if (err.statusCode === 410) {
      // Подписка устарела (устройство удалено/браузер сброшен) — удалить из БД
      await pb.collection('user_devices').delete(device.id)
    }
  }
}
```

### Service Worker обрабатывает push:
```javascript
// sw.js
self.addEventListener('push', event => {
  const data = event.data.json()
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    data: data.data
  })
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  clients.openWindow(`/chat/${event.notification.data.chatId}`)
})
```

### Логика:
- ❌ Не отправлять если чат открыт прямо сейчас
- ❌ Не отправлять если чат замьючен
- ✅ Группировать: несколько сообщений подряд = одно уведомление
- ✅ Бейдж на иконке PWA (Android): `navigator.setAppBadge(unreadCount)`

---

## 🎨 ДИЗАЙН (Apple + Telegram)

### Цветовая палитра:
```css
/* Светлая тема */
--bg-primary: #FFFFFF;
--bg-secondary: #F2F2F7;
--bg-tertiary: #E5E5EA;
--accent: #007AFF;
--accent-secondary: #34C759;
--text-primary: #000000;
--text-secondary: #8E8E93;
--bubble-out: #007AFF;
--bubble-in: #F2F2F7;
--glass: rgba(255, 255, 255, 0.72);
--separator: rgba(60, 60, 67, 0.12);

/* Тёмная тема */
--bg-primary: #000000;
--bg-secondary: #1C1C1E;
--bg-tertiary: #2C2C2E;
--text-primary: #FFFFFF;
--text-secondary: #8E8E93;
--bubble-out: #007AFF;
--bubble-in: #2C2C2E;
--glass: rgba(28, 28, 30, 0.82);
--separator: rgba(84, 84, 88, 0.36);
```

### Типографика:
- `-apple-system, BlinkMacSystemFont, "SF Pro Text"` → fallback `"Inter"`
- Desktop: 15px текст, 13px мета, 11px метки
- Mobile: 17px текст (крупнее для читаемости на телефоне)

### Компоненты:
- Пузыри: `border-radius: 18px`, SVG-хвостик как iMessage
- Desktop sidebar: 280px фиксированная ширина
- Glassmorphism на header: `backdrop-filter: blur(20px) saturate(180%)`
- Framer Motion: spring transitions, stagger lists
- Mobile: bottom sheet для контекстного меню (анимация снизу вверх)
- Skeleton loaders

### Специфика мобильного дизайна:
- Bottom tab bar: высота 83px (49px + safe area bottom)
- Navigation bar: высота 44px + safe area top
- Пузыри сообщений: максимум 75% ширины экрана
- Input bar: min-height 50px, растягивается до 4 строк
- Аватарки в списке чатов: 52px (на мобиле) / 46px (десктоп)

---

## 👤 ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ

### Настройки профиля:
- Имя (до 50 символов)
- Аватарка (загрузка, кроп кругом, сохраняется в **PocketBase** `avatarUrl`)
- Bio (до 70 символов)
- Email (только просмотр)
- Дата регистрации

### Страница настроек:
- Тема: Светлая / Тёмная / Системная
- Язык: 🇷🇺 RU / 🇬🇧 EN (мгновенная смена)
- Уведомления: вкл/выкл, запросить разрешение
- Конфиденциальность: «последний раз в сети» — все / никто
- Установить приложение (кнопка если PWA не установлено)
- Очистить кэш
- Выйти

---

## 🗂 ЧАТЫ

### Типы: личный (direct) / групповой (group, до 500 участников)

### Управление группой (owner/admin):
- Название, аватарка, описание
- Участники: добавить/удалить/назначить админом
- Закреплённое сообщение (баннер вверху чата)
- Мьют / покинуть / удалить чат

### Список чатов:
- Сортировка по времени последнего сообщения
- Превью: текст / «📷 Фото» / «🎤 Голосовое 0:23» / «GIF»
- Бейдж непрочитанных
- Зелёная точка онлайн
- Поиск по чатам
- Архив чатов

---

## 🌐 ИНТЕРНАЦИОНАЛИЗАЦИЯ (i18n)

### Библиотека: `i18next` + `react-i18next` + `i18next-browser-languagedetector`

### Структура файлов:
```
src/locales/
├── ru/translation.json
└── en/translation.json
```

### Инициализация:
```typescript
// src/i18n.ts
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { ru: { translation: ru }, en: { translation: en } },
    fallbackLng: 'en',
    supportedLngs: ['ru', 'en'],
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'mira_language'
    },
    interpolation: { escapeValue: false }
  })
```

### Ключевые строки перевода (RU / EN):

| Ключ | RU | EN |
|---|---|---|
| `chats.title` | Чаты | Chats |
| `chats.newChat` | Новый чат | New Chat |
| `chats.online` | В сети | Online |
| `chats.typing` | печатает... | typing... |
| `messages.inputPlaceholder` | Написать сообщение... | Write a message... |
| `messages.reply` | Ответить | Reply |
| `messages.forward` | Переслать | Forward |
| `messages.edited` | изменено | edited |
| `messages.deleted` | Сообщение удалено | Message deleted |
| `settings.title` | Настройки | Settings |
| `settings.theme` | Тема | Theme |
| `settings.language` | Язык | Language |
| `common.cancel` | Отмена | Cancel |
| `common.today` | Сегодня | Today |
| `common.yesterday` | Вчера | Yesterday |

### Форматирование дат с локалью:
```typescript
import { formatDistanceToNow } from 'date-fns'
import { ru, enUS } from 'date-fns/locale'
const locale = i18n.language === 'ru' ? ru : enUS
formatDistanceToNow(date, { locale, addSuffix: true })
// RU: "5 минут назад" | EN: "5 minutes ago"
```

### Смена языка:
```typescript
const changeLanguage = async (lang: 'ru' | 'en') => {
  await i18n.changeLanguage(lang)
  await updateUserProfile({ language: lang })  // сохранить в БД
}
```

---

## 📂 СТРУКТУРА ПРОЕКТА

```
mira-messenger/
├── client/                         # React PWA
│   ├── public/
│   │   ├── manifest.webmanifest
│   │   ├── icons/
│   │   │   ├── icon-192.png
│   │   │   ├── icon-512.png
│   │   │   └── icon-512-maskable.png
│   │   └── screenshots/
│   └── src/
│       ├── components/
│       │   ├── auth/
│       │   │   └── GoogleLoginButton.tsx
│       │   ├── chat/
│       │   │   ├── ChatList.tsx          # Список чатов
│       │   │   ├── ChatWindow.tsx        # Окно чата
│       │   │   ├── MessageBubble.tsx     # Пузырь сообщения
│       │   │   ├── LinkPreviewCard.tsx   # Карточка ссылки
│       │   │   ├── MessageInput.tsx      # Поле ввода
│       │   │   ├── ReplyPreview.tsx      # Панель ответа
│       │   │   ├── ForwardModal.tsx      # Модалка репоста
│       │   │   ├── VoiceRecorder.tsx     # Запись голоса
│       │   │   ├── EmojiPicker.tsx
│       │   │   ├── GifPicker.tsx
│       │   │   └── MessageContextMenu.tsx # Long press / right click
│       │   ├── layout/
│       │   │   ├── DesktopLayout.tsx     # Sidebar + chat (≥768px)
│       │   │   ├── MobileLayout.tsx      # Stack navigation (<768px)
│       │   │   ├── BottomTabBar.tsx      # Mobile bottom nav
│       │   │   └── NavigationBar.tsx     # Mobile top nav в чате
│       │   ├── pwa/
│       │   │   ├── InstallBanner.tsx     # Баннер установки (Android)
│       │   │   └── IOSInstallGuide.tsx   # Инструкция для iOS
│       │   ├── profile/
│       │   └── ui/                       # Button, Avatar, Skeleton и т.д.
│       ├── hooks/
│       │   ├── useSocket.ts
│       │   ├── useIsMobile.ts            # useMediaQuery('(max-width:768px)')
│       │   ├── usePWAInstall.ts          # beforeinstallprompt логика
│       │   ├── useNetworkStatus.ts       # online/offline events
│       │   └── useSwipeBack.ts           # Touch swipe для навигации
│       ├── store/
│       │   ├── authStore.ts
│       │   ├── chatStore.ts
│       │   ├── messageStore.ts
│       │   └── offlineStore.ts
│       ├── services/
│       │   ├── api.ts
│       │   ├── socket.ts
│       │   └── firebase.ts
│       ├── locales/
│       │   ├── ru/translation.json
│       │   └── en/translation.json
│       ├── i18n.ts
│       └── pages/
│           ├── ChatsPage.tsx
│           ├── ChatPage.tsx
│           ├── SearchPage.tsx
│           └── ProfilePage.tsx
│
└── server/                         # Node.js / Fastify Backend
    └── src/
        ├── routes/
        │   ├── auth.ts
        │   ├── chats.ts
        │   ├── messages.ts
        │   └── users.ts
        ├── socket/
        │   └── handlers/
        │       ├── message.ts
        │       ├── presence.ts
        │       └── typing.ts
        └── services/
            ├── pocketbase.ts       # БД + файловое хранилище медиа
            ├── firebase-admin.ts
            ├── webpush.ts          # web-push (VAPID), мульти-устройства
            └── linkPreview.ts
```

---

## 🚀 ПЛАН РАЗРАБОТКИ — 14 ЭТАПОВ

> ⚠️ **Строго один этап за раз. После каждого — отчитайся и жди «продолжай».**

---

### ЭТАП 1 — Инфраструктура
- Создать монорепо `client/` + `server/`
- Vite + React + TypeScript + Tailwind + vite-plugin-pwa
- Настроить PocketBase: коллекции + **API Rules (RLS)** — обязательно
- Настроить Firebase (Google Auth)
- Сгенерировать VAPID ключи для Web Push (`web-push generate-vapid-keys`)
- Базовый Fastify сервер, GET `/health` → 200

✅ **Результат:** все сервисы запущены, Vite dev server работает

---

### ЭТАП 2 — PWA манифест и базовая адаптивность
- Настроить `manifest.webmanifest` полностью
- Иконки 192/512/maskable (сгенерировать заглушки)
- Настроить `vite-plugin-pwa` с Workbox
- `safe-area-inset` CSS для iPhone
- Компонент `InstallBanner` (Android) и `IOSInstallGuide` (iOS)
- Hook `usePWAInstall` — слушать `beforeinstallprompt`
- Проверить: Chrome DevTools → Application → Manifest — всё зелёное

✅ **Результат:** приложение устанавливается на Android с браузера; на iOS показывается инструкция

---

### ЭТАП 3 — Авторизация
- Экран входа: кнопка «Войти через Google», красивый дизайн
- Firebase signInWithPopup → idToken → POST `/auth/google`
- Бэкенд: верификация, upsert пользователя, JWT
- HOC `<RequireAuth>`
- Онбординг: имя + аватарка при первом входе
- Тихая авторизация

✅ **Результат:** вход через Google работает

---

### ЭТАП 4 — Адаптивные лейауты
- `useIsMobile` hook
- `DesktopLayout`: sidebar 280px + chat area
- `MobileLayout`: стековая навигация (ChatsPage → ChatPage)
- `BottomTabBar`: Чаты / Поиск / Профиль (только мобила)
- `NavigationBar`: «← Назад» + имя чата + ℹ (только мобила в чате)
- Анимация перехода: slide left при открытии чата, slide right при закрытии
- Hook `useSwipeBack`: touch start/end → swipe right → navigate back

✅ **Результат:** на ПК sidebar+chat, на мобиле стековая навигация с анимацией

---

### ЭТАП 5 — Список чатов и создание чатов
- Список чатов с аватарками, превью, бейджами
- **Ленивая загрузка (lazy load) списка чатов — по 20 чатов за раз**, infinite scroll вниз. Запрос: `GET /api/collections/chat_members?page=1&perPage=20&sort=-updated`. Не загружать все чаты сразу — это убьёт производительность при 200+ диалогах.
- Поиск пользователей по имени/email
- Создание личного и группового чата
- Swipe left/right по чату в списке (мобила)
- Pull-to-refresh (мобила)

✅ **Результат:** можно создать чат, список отображается корректно на обеих платформах

---

### ЭТАП 6 — Текстовые сообщения (Real-time)
- Socket.IO: join_chat, send_message, new_message
- `MessageBubble`: входящие/исходящие, время, хвостики
- Desktop: Enter = отправить, Shift+Enter = новая строка
- Mobile: кнопка ➤ для отправки
- Бесконечная подгрузка (30 сообщений, scroll вверх)
- Автоскролл вниз
- Клавиатура на мобиле: visualViewport API — инпут прилипает

✅ **Результат:** переписка работает, на мобиле клавиатура не перекрывает инпут

---

### ЭТАП 7 — Статусы: прочтение, онлайн, typing
- ⏳ / ✓ / ✓✓ серые / ✓✓ синие
- `mark_read_batch` — один запрос при открытии чата
- Индикатор «печатает...» (дебаунс 2 сек)
- Онлайн-статус, «последний раз в сети»
- Бейдж непрочитанных в списке и в title браузера: `(3) MIRA`
- `navigator.setAppBadge(n)` — бейдж на иконке PWA (Android)

✅ **Результат:** статусы работают как в Telegram

---

### ЭТАП 8 — Медиа: фото, emoji, GIF
- Emoji picker (emoji-mart)
- GIF picker (Giphy)
- Фото: Desktop — drag&drop + кнопка; Mobile — tap кнопки → input type=file с capture
- Сжатие до 1920px, загрузка **в PocketBase** (multipart/form-data), лайтбокс

✅ **Результат:** emoji, GIF, фото работают

---

### ЭТАП 9 — Голосовые сообщения
- `MediaRecorder API`: `audio/webm;codecs=opus` (Chrome/Android) / `audio/mp4` (iOS Safari) — автоопределение
- Desktop: кнопка 🎤 → click to start/stop
- Mobile: tap & hold → запись; свайп вверх → фиксировать; свайп влево → отмена
- wavesurfer.js для воспроизведения
- Загрузка **в PocketBase** (multipart/form-data, поле `file` в записи messages)

✅ **Результат:** голосовые работают включая iOS Safari

---

### ЭТАП 10 — Взаимодействие с сообщениями
- Desktop: правая кнопка → контекстное меню
- Mobile: long press (500ms) → bottom sheet с действиями (анимация снизу вверх, как в iMessage)
- Минимальная зона нажатия: 44×44px
- Reply: панель с цитатой над инпутом
- Forward: модалка выбора чата
- Реакции, редактирование (48ч), удаление, закрепить, информация

✅ **Результат:** все действия с сообщениями работают на обеих платформах

---

### ЭТАП 11 — Превью ссылок
- Бэкенд: open-graph-scraper, linkPreview JSON, Socket event
- Компонент `LinkPreviewCard`

✅ **Результат:** ссылки отображаются как карточки

---

### ЭТАП 12 — Offline-режим
- Workbox (vite-plugin-pwa) кэширует статику
- IndexedDB outbox для pending сообщений
- `online`/`offline` events → processQueue
- offlineStore: addToQueue / processQueue / removeFromQueue

✅ **Результат:** сообщения не теряются при потере сети

---

### ЭТАП 13 — Push-уведомления (Web Push)
- Запросить разрешение при входе (или в настройках)
- `pushManager.subscribe()` с VAPID ключами → сохранить subscription на бэкенд
- Бэкенд: `web-push` отправляет уведомление при новом сообщении
- Service Worker: `push` event → `showNotification`; `notificationclick` → открыть чат
- `navigator.setAppBadge` / `clearAppBadge` при прочтении

✅ **Результат:** push-уведомления работают в браузере и в установленном PWA

---

### ЭТАП 14 — Настройки, профиль, i18n, финал
- Профиль: имя, bio, аватарка (кроп)
- Настройки: тема, язык (RU/EN), уведомления, конфиденциальность
- i18next: полная локализация всего интерфейса
- Кнопка «Установить приложение» в настройках (если PWA не установлена)
- Тёмная тема на всех компонентах
- Анимации Framer Motion финальная полировка
- Виртуализация списка сообщений (react-window)
- ESLint + Prettier
- README с инструкцией

✅ **Результат:** мессенджер MIRA полностью готов — PWA, адаптивный, устанавливается на телефон**

---

## ✅ ОБЩИЕ ТРЕБОВАНИЯ

- Весь код строго на **TypeScript** — никакого `any`
- ESLint + Prettier
- Все секреты — только в `.env`
- Никакого N+1: батчить, кэшировать в Zustand
- Graceful error handling: `try/catch`, toast-уведомления
- Минимальная зона тапа на мобиле: 44×44px
- Глобальный поиск по чатам и пользователям
- Поиск по сообщениям внутри чата (Ctrl+F / кнопка на мобиле): **осуществляется запросом к PocketBase** с фильтром `content ~ "строка поиска" && chatId = "..."`. Категорически запрещено скачивать все сообщения чата на клиент и фильтровать через JavaScript — это убьёт производительность.
