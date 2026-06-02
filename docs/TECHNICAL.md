# Техническая документация — Revolution Print Platform

> Репозиторий: [github.com/5eeee/revolution-print](https://github.com/5eeee/revolution-print)  
> Автор: Владимир Кутомкин

## 1. Назначение

B2B-платформа управления типографией: клиенты, заказы, документы, производство, внутренний чат, калькуляторы, сметы. Роли: **admin**, **manager**, **production**, **owner**.

## 2. Стек

**Backend:** Node.js, Express, Sequelize 6, PostgreSQL, JWT, multer, express-validator  
**Frontend:** HTML5, CSS3, Vanilla JavaScript SPA  
**Infra:** Docker Compose, Nginx, PM2, Let's Encrypt

## 3. Структура

```
backend/
├── server.js           # Express :3100
├── seed.js             # Seed БД
├── models/             # Sequelize models
├── routes/             # auth, clients, orders, documents…
├── controllers/
├── middleware/
└── uploads/

frontend/               # SPA :8080
├── index.html
├── css/, js/

nginx/, docker-compose.yml, deploy.sh
```

## 4. API (`/api`, порт 3100)

| Router | Endpoints |
|--------|-----------|
| `/api/auth` | login, me, change-password, profile, avatar, users/online |
| `/api/clients` | CRUD + take |
| `/api/orders` | CRUD, calculators, breakdown, designs, estimates, messages |
| `/api/documents` | CRUD, generate/:orderId |
| `/api/messages` | GET, POST, DELETE |
| `/api/production` | CRUD компаний, orders |
| `/api/admin` | settings, users CRUD |
| `/api/upload` | POST upload, DELETE |
| GET | `/health` |

## 5. Sequelize-модели

`User`, `Client`, `Order`, `Document`, `Design`, `Message`, `OrderCalculator`, `ProductionBreakdown`, `ProductionCompany`, `CostEstimate`, `CompanySetting`

## 6. Переменные окружения (`backend/.env`)

`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `PORT`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`, `UPLOAD_DIR`, `SMTP_*`

## 7. Запуск

```bash
cd backend && npm install
cp .env.example .env
npm run seed          # admin@revolution.print / admin123
npm run dev           # :3100

# Frontend (отдельно или start-dev.bat):
# static server на :8080
```

Windows: `start-dev.bat` — backend + frontend одновременно.

## 8. Production

```bash
./deploy.sh
docker compose -f docker-compose.prod.yml up -d
# Nginx reverse proxy + SSL
```

## 9. Бэкап

Скрипты backup/restore для Windows в корне проекта.
