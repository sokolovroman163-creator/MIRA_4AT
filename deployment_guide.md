# 🔑 Инструкция по ключам и деплою (Где искать и как)

Эта инструкция содержит ваши реальные ключи и описание того, где их найти в консолях разработчика, если вы их потеряете или захотите сменить.

---

## 🧭 Где искать ключи?

### 1. Переменные Firebase (Web & Admin)
Все ключи для фронтенда и бэкенда находятся в **[Firebase Console](https://console.firebase.google.com/)**:
- **Для клиента (VITE_FIREBASE_...)**: Настройки проекта (шестеренка) -> **Project Settings** -> Вкладка **General**. Прокрутите вниз до раздела "Your apps". Там вы найдете "Firebase SDK snippet" в формате "Config".
- **Для сервера (FIREBASE_PROJECT_ID и др.)**: Те же настройки проекта -> Вкладка **Service accounts**. Там можно сгенерировать новый закрытый ключ (JSON), данные из которого (Project ID, Email, Private Key) вставляются в `server/.env`.

### 2. Google OAuth (Google Client ID)
Находится в **[Google Cloud Console](https://console.cloud.google.com/)**:
- Перейдите в **APIs & Services** -> **Credentials**.
- Ищите под заголовком **OAuth 2.0 Client IDs**. Если его нет — создайте (тип: Web application).
- **Важно для деплоя**: Добавьте ваш домен (например, `https://mira.ru`) и `https://mira.ru/auth/google/callback` в список "Authorized JavaScript origins" и "Authorized redirect URIs".

### 3. VAPID Keys (Push-уведомления)
Генерируются один раз. Можно использовать те, что уже есть, или создать новые командой `npx web-push generate-vapid-keys`.
- **Public Key**: Идет и в клиент (VITE_VAPID_PUBLIC_KEY), и на сервер.
- **Private Key**: Идет **только** на сервер.

### 4. Giphy API (Гифки)
Находится в **[Giphy Developers](https://developers.giphy.com/dashboard/)**:
- Создайте новое приложение (App) и получите свой **API Key**.

---

## 📄 Настройка файлов .env на сервере

Скопируйте эти блоки и вставьте их в соответствующие файлы на сервере (через `nano` или `vim`).

### 1. Сервер (`/var/www/mira/server/.env`)
```env
PORT=3000
CLIENT_URL=https://ваш-домен.ru
POCKETBASE_URL=http://127.0.0.1:8090
POCKETBASE_ADMIN_EMAIL=sokolovroman163@gmail.com
POCKETBASE_ADMIN_PASSWORD=Roma180388

# Firebase Admin (Уже настроено)
FIREBASE_PROJECT_ID=mira-chat-27fdd
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@mira-chat-27fdd.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCeKJ0ussVJTFW7\nl9CgSOR0gGjGF3GJ3OFwKi2WSykIHPHz3Q9Y1VSdHlkfNwoI6cDbpCMGE9lDKnX2\ne0A//POKb87iQ8kaSycuRWmTJv5GCMQrozS40gbqd5cnWn12l5HrKRK3RgAnCbIG\nDpkuL30DL+Lu+bRu+u+Blf2JyLP88GdF03KbjZRReo/y8g0AeLoNCa4JwO619Rg1\niAiAEDIm1ALwM7TdvDainff9l/BrWgJW9/WZf4Ac8Xw9tyLFjWNnT5/LN3fOt5Uj\nIM14iS0cU8pIQJoPaKg1AssyvYJc/5NtzMjla2FzOLwU2owNTXzt5eiDbZ99ybU/\nARK40KSLAgMBAAECggEAEEEtUmDWLN/XCdYi/24uaJjP69f598jHNJ9pGwKzf112\nMnF8Q819Cj7VuwMNmXfotcorPVMp56DECeaF5m2pXAd8tD1yPC0QJE3G+XQu+uSo\nwLFf2EThqBRNaSKANYGDYi9Q+JwNpPV2oe+7J4eC6iJwSM5KEIPivKc9LP1/HhYv\nq3kqOssdzXhl5Agr+EkXsyh7Vhf8DwNqUzV9D9RntmtVcKCpiMm8KFz0SFS8R3hu\nu49vIexnRWit+EKwbzZrxjkAeA8oyseZKZbQ+540N4lM7eKn46tY0uffM4B8ItCN\n+5du2QJKrrEcXMTdzBvYOOYS8OF7NxrwHfCg3GDkWQKBgQDQxuo5jTde9pKWoKUl\nrgWmE1Z3x0gEFIPDoP7qTGFUHPsJczWbhEKCnTzyC7MpcHv06Ahm7lnyOXuICgMe\nECnZ7sOZMKSGJ8U7gV1B5czQ8Zb3lBhuPNml+sTtHqB0965G3Mft0+OVa1X5f1bP\nMJEjbS1oORq1d9YQKUAYsowqaQKBgQDB7q223NZ2GQMscb/Rxf17sEM0L3TTLhc4\neAl6byWtahmXwNULcM1D0aV9AwPwdRd5ZOU7HUNYRFgL68SQMzfnoRJRefVogQ6q\n/70GMCfyXR2vyWZhDwnoDLhcoSvodcSB+wZ5LqOSwQdNZGtL3d7d7lLCzif2QiZg\nZBP+JeYw0wKBgARCWprr95o3W4w5IMVhBHp74IK3DRAQPxPpn+m1vzKRGMn7kLdo\nflbd0FV7yZ7pzY2Ugj9fU3RumcePtLqTR9dLWLAyXtjhzNNG81kZ0BDfLN5GJi1x\njlslf4j62/km6GZHsMh4TydINkvNvj6h1gQsAQYkTBgxpqtTvBwE4HkpAoGALLuu\nbEjCW1lnpv/R/ERMNRSyW746l1/BUXA213v91+NqZdvACLSLVIJuRsjERtnrgT/p\ntFoKp7iUCqPmolB+K7q2q/6SwflK9dypsFy5Sil6aIrvR6Idad5NRGiU5TkNC+Jo\nWtmMN5S453wrV8Ok3dJUWsUM6LvXeFJ9XhlF4KsCgYEAjIPD4PY1Ri635zxt882W\nDyBtHx0tO3ns8vMRTnBY+VWLNj4j98MdP02y+3ud23ub7yCsACNZyI3VmYwdm3pG\nPKfmGVKtOJGKHTrvknj2f0xsMVe0ClTZYeuU9UVRRo17N22e3CaaY74Ua7yFdYy0\nfddY6JuPCJo+S4nZ4ST7x+k=\n-----END PRIVATE KEY-----\n"

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# VAPID Keys
VAPID_PUBLIC_KEY=BFpLZczFSPF2e1KxALX6KM-pvsa_Cs2WwBoHcgcIscNZEIrnJDCbGUzpO6o45613V6HT4GHd4Z0QV1tHfne1XeM
VAPID_PRIVATE_KEY=_H2ZmpZnAWs8N-gKx7-44GolY-2pJuSnXu6niQkLrfU
VAPID_SUBJECT=mailto:admin@mira.local

# Giphy
GIPHY_API_KEY=your-giphy-api-key
```

### 2. Клиент (`/var/www/mira/client/.env`)
```env
VITE_API_URL=https://ваш-домен.ru
VITE_SOCKET_URL=https://ваш-домен.ru
VITE_POCKETBASE_URL=https://ваш-домен.ru

# Firebase Config (Уже настроено)
VITE_FIREBASE_API_KEY=AIzaSyBaqFPVBMuLlylHs9GBUdPF3kZWFfMSz9A
VITE_FIREBASE_AUTH_DOMAIN=mira-chat-27fdd.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=mira-chat-27fdd
VITE_FIREBASE_STORAGE_BUCKET=mira-chat-27fdd.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=988094715563
VITE_FIREBASE_APP_ID=1:988094715563:web:8f86bcbf9511a56e0f89ee

# VAPID
VITE_VAPID_PUBLIC_KEY=BFpLZczFSPF2e1KxALX6KM-pvsa_Cs2WwBoHcgcIscNZEIrnJDCbGUzpO6o45613V6HT4GHd4Z0QV1tHfne1XeM

# Google OAuth
VITE_GOOGLE_CLIENT_ID=988094715563-eal8hj5f52l477dr96us04qkt1rb74ao.apps.googleusercontent.com

# Giphy
VITE_GIPHY_API_KEY=your-giphy-api-key
```

---

## 🚀 Как деплоить (Краткая шпаргалка)

1. **Сервер**: Клонируйте проект, установите Node.js 20+, PM2 и Nginx.
2. **База**: Скачайте PocketBase для Linux, запустите его через PM2 (`pm2 start "./pocketbase serve"`).
3. **Конфиг**: Создайте `.env` файлы (см. выше) и замените `https://ваш-домен.ru` на ваш реальный домен.
4. **Сборка**:
   - В папке `client`: `npm install && npm run build`
   - В папке `server`: `npm install && npm run build`
5. **Запуск**: В папке `server`: `pm2 start dist/index.js --name mira-server`.
6. **Nginx**: Настройте проксирование на порты 3000 (API/Socket) и 8090 (Base) + статика из `client/dist`.
7. **SSL**: Обязательно выполните `certbot --nginx`, так как без HTTPS не будет работать микрофон (голосовые) и уведомления.
