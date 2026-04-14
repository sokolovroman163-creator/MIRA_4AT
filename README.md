# MIRA Messenger

A full-featured PWA messenger built with React 19, TypeScript, Fastify, Socket.IO, and PocketBase. Works as a desktop web app and installs as a native-like mobile app.

## Tech Stack

**Client:** React 19, Vite 8, TypeScript, Tailwind CSS 4, Zustand, Framer Motion, Socket.IO Client, i18next (RU/EN), react-window  
**Server:** Node.js, Fastify, Socket.IO, PocketBase, Firebase Admin (auth), web-push  
**Database:** PocketBase  
**Auth:** Google OAuth via Firebase Auth

## Features

- Real-time messaging (text, images, GIFs, voice messages)
- Message interactions: reply, edit, delete, forward, reactions, link previews
- Online/offline status, typing indicators, read receipts
- Push notifications (Web Push API + VAPID)
- Offline support with message queue and service worker caching
- PWA: installable on desktop and mobile, works offline
- Virtual scrolling for large chat histories (react-window)
- Dark/light theme, i18n (Russian/English)
- Responsive design (mobile < 768px, desktop >= 768px)

## Prerequisites

- **Node.js** >= 18
- **PocketBase** running on `http://127.0.0.1:8090`
- **Firebase project** with Google sign-in enabled
- (Optional) **Tenor API key** for GIF search

## Setup

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Configure environment variables

Copy the example files and fill in your values:

```bash
# Client
cp client/.env.example client/.env

# Server
cp server/.env.example server/.env
```

**Client (`client/.env`):**
```
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
VITE_POCKETBASE_URL=http://127.0.0.1:8090
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_VAPID_PUBLIC_KEY=...
VITE_TENOR_API_KEY=...           # optional, for GIF search
```

**Server (`server/.env`):**
```
PORT=3000
CLIENT_URL=http://localhost:5173
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="..."
POCKETBASE_URL=http://127.0.0.1:8090
POCKETBASE_ADMIN_EMAIL=admin@mira.local
POCKETBASE_ADMIN_PASSWORD=...
JWT_SECRET=...
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@mira.local
```

Generate VAPID keys with:
```bash
npx web-push generate-vapid-keys
```

### 3. Start PocketBase

Download PocketBase from [pocketbase.io](https://pocketbase.io) and run:

```bash
./pocketbase serve
```

Create the required collections via the PocketBase admin UI (`http://127.0.0.1:8090/_/`).

### 4. Run development servers

```bash
# Terminal 1 — server (port 3000)
npm run dev:server

# Terminal 2 — client (port 5173)
npm run dev:client
```

Open `http://localhost:5173` in your browser.

## Build for Production

```bash
# Build client
cd client
npm run build      # outputs to client/dist/

# Build server
cd server
npm run build      # outputs to server/dist/
npm start          # runs production server
```

## Project Structure

```
├── client/                   # React PWA (Vite)
│   ├── public/
│   │   └── sw-push.js        # Push notification SW handlers
│   ├── src/
│   │   ├── components/       # UI components
│   │   │   ├── chat/         # MessageBubble, MessageInput, etc.
│   │   │   ├── layout/       # DesktopLayout, MobileLayout
│   │   │   ├── pwa/          # InstallBanner, IOSInstallGuide
│   │   │   └── ui/           # Avatar, Skeleton, NetworkBanner
│   │   ├── hooks/            # useSocket, usePushNotifications, etc.
│   │   ├── locales/          # i18n translations (ru, en)
│   │   ├── pages/            # ChatPage, ChatsPage, LoginPage, etc.
│   │   ├── services/         # api.ts, socket.ts, firebase.ts
│   │   ├── store/            # Zustand stores
│   │   └── types/            # TypeScript types
│   └── vite.config.ts        # Vite + PWA config
│
├── server/                   # Fastify API + Socket.IO
│   └── src/
│       ├── routes/           # REST API (messages, chats, users, auth)
│       ├── services/         # webpush, linkPreview
│       └── socket/handlers/  # Socket event handlers
│
└── messenger-prompt-2.md     # Full project specification
```

## License

Private project.
