require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');
const path = require('path');

// Маршруты
const authRoutes = require('./routes/auth');
const clientsRoutes = require('./routes/clients');
const ordersRoutes = require('./routes/orders');
const documentsRoutes = require('./routes/documents');
const chatRoutes = require('./routes/chat');
const productionRoutes = require('./routes/production');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/upload');

const { User } = require('./models');
const { hashPassword } = require('./utils/hash');

const app = express();
const PORT = process.env.PORT || 3000;

// Hide server identity
app.disable('x-powered-by');

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'development'
    ? true  // Разрешить все origin в dev-режиме 
    : (process.env.CORS_ORIGIN || 'http://localhost:8080'),
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Статические файлы (загрузки) — имена файлов содержат UUID, не перебираемы
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  dotfiles: 'deny',
  index: false,
}));

// Маршруты API
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/messages', chatRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

// Проверка здоровья
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Revolution Print API работает',
    timestamp: new Date(),
  });
});

// Обработчик ошибок 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Маршрут не найден',
  });
});

// Обработчик ошибок
app.use((err, req, res, next) => {
  console.error('Необработанная ошибка:', err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Внутренняя ошибка сервера',
  });
});

// Инициализация БД и запуск сервера
async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('Подключение к БД успешно');

    // Синхронизация моделей (для разработки)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('Модели синхронизированы');
    } else {
      await sequelize.sync();
      console.log('Модели инициализированы');
    }

    // Автоматическое создание admin при первом запуске
    const userCount = await User.count();
    if (userCount === 0) {
      await User.create({
        fullName: 'Администратор',
        email: 'admin@revolution.print',
        passwordHash: await hashPassword('admin123'),
        role: 'admin',
        active: true
      });
      console.log('Создан администратор: admin@revolution.print / admin123');
    }

    app.listen(PORT, () => {
      console.log(`Revolution Print API запущен на http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Ошибка при запуске:', error.message);
    process.exit(1);
  }
}

startServer();
