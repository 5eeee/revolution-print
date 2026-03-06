# Revolution Print Platform

Веб-приложение для управления типографией: клиенты, заказы, документы, производство, чат. Многопользовательский доступ с ролями (admin, manager, production).

## Структура проекта

```
revolution-print/
├── backend/           # Node.js + Express + Sequelize + PostgreSQL
│   ├── server.js      # Точка входа
│   ├── seed.js        # Заполнение БД тестовыми данными
│   ├── config/        # Конфигурация БД
│   ├── models/        # Модели данных (Sequelize)
│   ├── routes/        # API маршруты
│   ├── controllers/   # Логика обработки запросов
│   ├── middleware/     # Аутентификация, роли, валидация, загрузка файлов
│   ├── utils/         # Утилиты (хеширование, JWT, логгер, файлы)
│   └── uploads/       # Загруженные файлы
├── frontend/          # HTML + CSS + Vanilla JS (SPA)
│   ├── index.html
│   ├── css/style.css
│   └── js/            # API, авторизация, страницы, утилиты
├── nginx/             # Конфигурация Nginx для production
├── docker-compose.yml          # Docker для разработки
├── docker-compose.prod.yml     # Docker для production
├── deploy.sh          # Скрипт деплоя на Linux-сервер
├── install.bat        # Установка на Windows
├── start-dev.bat      # Быстрый запуск (Windows)
├── backup-db.bat      # Бэкап базы данных (Windows)
├── restore-db.bat     # Восстановление базы данных (Windows)
└── init.sql           # Инициализация схемы БД
```

---

# Установка на локальный ПК (Windows)

## Быстрый способ — один скрипт

1. Установите [Node.js 18+](https://nodejs.org/) (LTS) и [PostgreSQL 15+](https://www.postgresql.org/download/) (запомните пароль при установке).
2. Запустите:

```
start-dev.bat
```

Скрипт автоматически запустит backend на порту **3100** и frontend на порту **8080**, затем откроет браузер.

**Вход в систему:**
- Откройте `http://localhost:8080`
- Логин: `admin@revolution.print`
- Пароль: `admin123`

> Если данных в БД ещё нет, сначала выполните seed (см. ниже).

---

## Пошаговая установка вручную

### 1. Установите необходимое ПО

- **Node.js 18+** — https://nodejs.org (версия LTS, при установке оставьте галочки по умолчанию)
- **PostgreSQL 15+** — https://www.postgresql.org/download/ (запомните пароль, который зададите для пользователя `postgres`)

Убедитесь, что папка `bin` PostgreSQL добавлена в `PATH` (обычно `C:\Program Files\PostgreSQL\15\bin`).

### 2. Создайте базу данных

Откройте PowerShell:

```powershell
psql -U postgres
```

Введите пароль PostgreSQL, затем выполните:

```sql
CREATE DATABASE revolution_print;
\q
```

### 3. Настройте переменные окружения

Создайте файл `backend\.env` (или отредактируйте существующий):

```env
# База данных
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=ваш_пароль_postgresql
DB_NAME=revolution_print

# JWT
JWT_SECRET=CHANGE_THIS_TO_RANDOM_SECRET_KEY
JWT_EXPIRES_IN=7d

# Сервер
PORT=3100
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:8080

# Файлы
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=75000000
```

> Обязательно замените `DB_PASSWORD` на пароль, который вы задали при установке PostgreSQL.

### 4. Установите зависимости и заполните БД

```powershell
cd backend
npm install
node seed.js
```

`seed.js` создаст таблицы и заполнит БД тестовыми данными (админ, менеджеры, клиенты, заказы).

### 5. Запустите backend

```powershell
cd backend
node server.js
```

Backend запущен на `http://localhost:3100`.

### 6. Запустите frontend

В **новом** терминале:

```powershell
cd frontend
npx http-server -p 8080 -c-1
```

Frontend доступен на `http://localhost:8080`.

### 7. Войдите в систему

Откройте `http://localhost:8080` в браузере.

| Роль | Email | Пароль |
|------|-------|--------|
| Администратор | `admin@revolution.print` | `admin123` |
| Менеджер | `ivan@revolution.print` | `password123` |
| Производство | `production@revolution.print` | `password123` |

---

## Альтернатива: Docker (Windows / macOS / Linux)

Установите [Docker Desktop](https://www.docker.com/products/docker-desktop/) и выполните:

```bash
docker-compose up -d
```

- Frontend: `http://localhost:8000`
- Backend API: `http://localhost:3000`

Для заполнения тестовыми данными:

```bash
docker-compose exec backend node seed.js
```

---

## Бэкап и восстановление БД (Windows)

**Создание бэкапа:**

```
backup-db.bat
```

Дамп сохранится в папку `backups/` вместе с копией загруженных файлов.

**Восстановление из бэкапа:**

```
restore-db.bat
```

Скрипт найдёт последний дамп в `backups/` и восстановит БД.

---

## Перенос проекта на другой компьютер

1. Скопируйте всю папку проекта (папку `node_modules` можно не копировать).
2. На новом компьютере установите Node.js и PostgreSQL.
3. Создайте базу данных `revolution_print`.
4. Отредактируйте `backend\.env` — укажите пароль PostgreSQL нового компьютера.
5. Выполните `cd backend && npm install`.
6. Восстановите данные из бэкапа (`restore-db.bat`) или запустите `node seed.js` для чистой установки.
7. Запустите `start-dev.bat`.

---

# Установка на сервер (Production)

Два варианта: **Docker** (рекомендуется) или **ручная установка**.

---

## Вариант 1: Docker (рекомендуется)

### Требования

- **Ubuntu 20.04+** (или другой Linux)
- **Docker** и **Docker Compose v2**
- **Домен** с A-записью, указывающей на IP сервера

### 1. Установите Docker

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com | sudo bash
sudo usermod -aG docker $USER
# Перелогиньтесь для применения группы
```

### 2. Скопируйте проект на сервер

```bash
cd /opt
sudo git clone https://github.com/yourusername/revolution-print.git
cd revolution-print
sudo chown -R $USER:$USER .
```

Или загрузите архивом через `scp` / `rsync`.

### 3. Создайте файл `.env.production`

```bash
cp .env.production.example .env.production
nano .env.production
```

Заполните обязательные переменные:

```env
# База данных
DB_USER=rev_prod
DB_PASSWORD=сгенерируйте_надёжный_пароль
DB_NAME=revolution_print

# JWT — случайная строка минимум 32 символа
JWT_SECRET=сгенерируйте_случайный_секрет
JWT_EXPIRATION=7d

# Домен
DOMAIN=print.yourdomain.com
CORS_ORIGIN=https://print.yourdomain.com

# Backend
BACKEND_PORT=3000
```

> Сгенерируйте пароли: `openssl rand -base64 32`

### 4. Запустите деплой

```bash
chmod +x deploy.sh
./deploy.sh
```

Скрипт автоматически:
- Проверит наличие Docker
- Создаст самоподписанный SSL-сертификат (если нет настоящего)
- Подставит домен в конфигурацию Nginx
- Соберёт и запустит контейнеры (PostgreSQL, Backend, Nginx)

### 5. Заполните БД начальными данными

```bash
./deploy.sh seed
```

### 6. Получите SSL-сертификат Let's Encrypt

```bash
./deploy.sh ssl
```

### 7. Откройте сайт

```
https://print.yourdomain.com
```

### Управление сервером

| Команда | Описание |
|---------|----------|
| `./deploy.sh status` | Состояние контейнеров и ресурсы |
| `./deploy.sh logs` | Логи всех контейнеров |
| `./deploy.sh backup` | Резервная копия БД (хранится 14 дней) |
| `./deploy.sh update` | Обновить код и перезапустить |
| `./deploy.sh stop` | Остановить все контейнеры |
| `./deploy.sh seed` | Заполнить БД тестовыми данными |
| `./deploy.sh ssl` | Получить/обновить SSL через Let's Encrypt |

---

## Вариант 2: Ручная установка (без Docker)

### Требования

- **Ubuntu 20.04+**
- **Node.js 18+**
- **PostgreSQL 15+**
- **Nginx**
- **Домен** + **SSL-сертификат**

### 1. Подготовьте сервер

```bash
sudo apt update && sudo apt upgrade -y

# Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Nginx
sudo apt install -y nginx

# PM2 — менеджер процессов
sudo npm install -g pm2
```

### 2. Создайте базу данных

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE revolution_print;
CREATE USER revolution WITH PASSWORD 'надёжный_пароль';
GRANT ALL PRIVILEGES ON DATABASE revolution_print TO revolution;
\q
```

### 3. Разместите проект

```bash
cd /opt
sudo git clone https://github.com/yourusername/revolution-print.git
cd revolution-print
sudo chown -R $USER:$USER .
```

### 4. Настройте backend

```bash
cd /opt/revolution-print/backend
npm install --production
```

Создайте `backend/.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=revolution
DB_PASSWORD=надёжный_пароль
DB_NAME=revolution_print

JWT_SECRET=случайная_строка_минимум_32_символа
JWT_EXPIRES_IN=7d

PORT=3000
NODE_ENV=production
CORS_ORIGIN=https://print.yourdomain.com

UPLOAD_DIR=./uploads
MAX_FILE_SIZE=75000000
```

Заполните БД:

```bash
node seed.js
```

### 5. Запустите backend через PM2

```bash
cd /opt/revolution-print/backend
pm2 start server.js --name revolution-print
pm2 startup   # автозапуск при перезагрузке
pm2 save
```

### 6. Настройте Nginx

Создайте `/etc/nginx/sites-available/revolution-print`:

```nginx
upstream rp_backend {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name print.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name print.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/print.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/print.yourdomain.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    # Security headers
    add_header X-Frame-Options        "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection       "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000" always;

    client_max_body_size 100M;

    # Frontend
    location / {
        root /opt/revolution-print/frontend;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://rp_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Кэширование статики
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        root /opt/revolution-print/frontend;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

Активируйте:

```bash
sudo ln -s /etc/nginx/sites-available/revolution-print /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### 7. Получите SSL-сертификат

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d print.yourdomain.com
```

Certbot настроит автоматическое обновление сертификата.

### 8. Настройте файрвол

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 9. Проверьте работу

```bash
pm2 status                           # статус backend
sudo systemctl status nginx          # статус nginx
curl -s https://print.yourdomain.com/api/health  # проверка API
```

Откройте `https://print.yourdomain.com` в браузере.

---

## Мониторинг и обслуживание (Production)

```bash
# Логи backend
pm2 logs revolution-print

# Логи Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Мониторинг ресурсов
pm2 monit

# Перезапуск backend
pm2 restart revolution-print

# Бэкап БД
sudo -u postgres pg_dump revolution_print > /opt/backups/db_$(date +%Y%m%d).sql
```

---

## Чеклист безопасности для Production

- [ ] Задать надёжный `JWT_SECRET` (минимум 32 случайных символа)
- [ ] Задать надёжный пароль для PostgreSQL
- [ ] Включить HTTPS (Let's Encrypt)
- [ ] Настроить файрвол (UFW): только 22, 80, 443
- [ ] Настроить регулярные бэкапы БД (cron)
- [ ] Отключить доступ к PostgreSQL извне (только localhost)
- [ ] Обновлять зависимости (`npm audit`)
- [ ] Настроить мониторинг (pm2 / Docker healthcheck)

---

## API

Все запросы к API начинаются с `/api/`. Авторизация — через JWT-токен в заголовке `Authorization: Bearer <token>`.

### Аутентификация

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/auth/register` | Регистрация |
| POST | `/api/auth/login` | Вход |

### Клиенты

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/clients` | Список клиентов |
| POST | `/api/clients` | Создать клиента |
| GET | `/api/clients/:id` | Получить клиента |
| PUT | `/api/clients/:id` | Обновить клиента |
| DELETE | `/api/clients/:id` | Удалить клиента |
| POST | `/api/clients/:id/take` | Взять клиента на себя |

### Заказы

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/orders` | Список заказов |
| POST | `/api/orders` | Создать заказ |
| GET | `/api/orders/:id` | Получить заказ |
| PUT | `/api/orders/:id` | Обновить заказ |
| DELETE | `/api/orders/:id` | Удалить заказ |

### Документы

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/documents` | Список документов |
| POST | `/api/documents` | Создать документ |
| GET | `/api/documents/:id` | Получить документ |
| PUT | `/api/documents/:id` | Обновить документ |
| DELETE | `/api/documents/:id` | Удалить документ |

### Производство

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/production` | Список компаний |
| POST | `/api/production` | Добавить компанию |
| PUT | `/api/production/:id` | Обновить компанию |
| DELETE | `/api/production/:id` | Удалить компанию |

### Чат

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/messages` | История сообщений |
| POST | `/api/messages` | Отправить сообщение |
| DELETE | `/api/messages/:id` | Удалить сообщение |

### Администрирование (только admin)

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/admin/users` | Список пользователей |
| POST | `/api/admin/users` | Создать пользователя |
| PUT | `/api/admin/users/:id` | Обновить пользователя |
| DELETE | `/api/admin/users/:id` | Удалить пользователя |

---

## Роли пользователей

| Роль | Возможности |
|------|-------------|
| **admin** | Полный доступ, управление пользователями |
| **manager** | Клиенты, заказы, документы, чат |
| **production** | Просмотр заказов и производственной информации |

## Технологии

- **Backend:** Node.js, Express, Sequelize ORM, PostgreSQL, JWT, bcrypt, Multer
- **Frontend:** HTML5, CSS3, Vanilla JavaScript, Fetch API
- **Инфраструктура:** Docker, Nginx, PM2, Let's Encrypt

## Лицензия

MIT
