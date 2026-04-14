# 🚀 Инструкция по деплою MIRA Messenger на Beget (VPS)

Это руководство поможет вам перенести ваш мессенджер с локального компьютера на сервер Beget. Мы будем использовать **VPS (Ubuntu)**, так как это самый гибкий вариант для Node.js и PocketBase.

---

## 📋 Предварительные требования
1. **VPS от Beget**: Рекомендуется Ubuntu 22.04 или 24.04.
2. **Домен**: Привяжите домен к IP вашего сервера в панели Beget.
3. **SSH доступ**: Вы должны уметь заходить на сервер через терминал (или консоль Beget).

---

## 🛠 Шаг 1: Подготовка сервера

Зайдите на сервер через терминал и выполните команды для обновления системы и установки Node.js:

```bash
# Обновляем список пакетов
sudo apt update && sudo apt upgrade -y

# Устанавливаем Node.js (рекомендуемая версия)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Проверяем версии
node -v
npm -v

# Устанавливаем PM2 (менеджер процессов для фоновой работы)
sudo npm install -g pm2
```

---

## 📥 Шаг 2: Клонирование проекта

```bash
# Перейдите в папку, где будет лежать проект (например, /var/www)
cd /var/www
git clone https://github.com/sokolovroman163-creator/MIRA_4AT.git mira
cd mira

# Устанавливаем зависимости для всего проекта
npm run install:all
```

---

## 🗄 Шаг 3: Настройка PocketBase

PocketBase — это ваша база данных. На сервере нам нужна Linux-версия.

```bash
# Создаем папку для базы
mkdir pb_server
cd pb_server

# Скачиваем официальный бинарный файл для Linux (x64)
wget https://github.com/pocketbase/pocketbase/releases/download/v0.26.6/pocketbase_0.26.6_linux_amd64.zip

# Распаковываем (если нет unzip: sudo apt install unzip)
sudo apt install unzip
unzip pocketbase_0.26.6_linux_amd64.zip
rm pocketbase_0.26.6_linux_amd64.zip

# Запускаем один раз для проверки
./pocketbase serve --http="127.0.0.1:8090"
```
*Нажмите `Ctrl+C`, чтобы остановить.*

Чтобы PocketBase работал всегда, добавим его в PM2:
```bash
pm2 start "./pocketbase serve --http='127.0.0.1:8090'" --name "mira-db"
pm2 save
```

---

## ⚙️ Шаг 4: Настройка переменных окружения (.env)

На сервере вам нужно создать файлы `.env` с реальными данными.

### Для сервера (backend):
Создайте файл в папке `server/.env`:
```bash
nano server/.env
```
Вставьте туда содержимое из вашего локального файла, но измените URLs:
```env
PORT=3000
POCKETBASE_URL=http://127.0.0.1:8090
CLIENT_URL=https://ваш-домен.ru
JWT_SECRET=ВАШ_СЕКРЕТ_ИЗ_ЛОКАЛКИ
# Остальные настройки Firebase/WebPush/Google OAuth...
```

### Для клиента (frontend):
Создайте файл в папке `client/.env`:
```bash
nano client/.env
```
```env
VITE_API_URL=https://ваш-домен.ru
VITE_SOCKET_URL=https://ваш-домен.ru
VITE_POCKETBASE_URL=https://ваш-домен.ru
# Остальные настройки Firebase/VAPID/Google...
```

---

## 🏗 Шаг 5: Сборка и запуск

```bash
# Собираем клиент (превращаем React в статику)
cd client
npm run build
cd ..

# Собираем сервер
cd server
npm run build

# Запускаем сервер через PM2
pm2 start dist/index.js --name "mira-server"
pm2 save
```

---

## 🌐 Шаг 6: Настройка Nginx (Прокси)

Чтобы ваш сайт открывался по домену (порт 80/443), а не по порту 3000, нужен Nginx.

```bash
sudo apt install nginx
sudo nano /etc/nginx/sites-available/mira
```

Вставьте конфиг:
```nginx
server {
    listen 80;
    server_name ваш-домен.ru;

    # Раздача фронтенда (React билд)
    location / {
        root /var/www/mira/client/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Прокси на API PocketBase (файлы)
    location /api/files {
        proxy_pass http://127.0.0.1:8090;
        proxy_set_header Host $host;
    }

    # Прокси на основной бэкенд (Fastify)
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.IO
    location /socket.io {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Активируйте конфиг:
```bash
sudo ln -s /etc/nginx/sites-available/mira /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔒 Шаг 7: SSL (HTTPS) — Обязательно для уведомлений и микрофона!

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d ваш-домен.ru
```

---

## 💡 Полезные команды PM2
- `pm2 status` — проверить, что всё работает.
- `pm2 logs` — смотреть ошибки, если что-то не так.
- `pm2 restart all` — если вы обновили код через git pull.

---

**Поздравляю! Ваш MIRA Messenger должен быть доступен в сети.**
