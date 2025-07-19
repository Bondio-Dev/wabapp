const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const logger = require('./src/services/logger');
const db = require('./src/services/database');
const redis = require('./src/services/redis');

// Импортируем маршруты
const authRoutes = require('./src/controllers/auth');
const messageRoutes = require('./src/controllers/messages');
const contactRoutes = require('./src/controllers/contacts');
const webhookRoutes = require('./src/controllers/webhooks');
const amoRoutes = require('./src/controllers/amo');
const healthRoutes = require('./src/controllers/health');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ["http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware для безопасности
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.gupshup.io", "wss:", "ws:"],
      frameSrc: ["'self'", "https://*.amocrm.ru", "https://*.amocrm.com"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // максимум 100 запросов за окно
  message: 'Слишком много запросов с этого IP, попробуйте позже.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// CORS для AMO CRM виджета
app.use(cors({
  origin: function (origin, callback) {
    // Разрешаем запросы без origin (мобильные приложения, Postman и т.д.)
    if (!origin) return callback(null, true);

    const allowedOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [];

    // Разрешаем AMO CRM домены
    if (origin.includes('.amocrm.ru') || origin.includes('.amocrm.com')) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Не разрешено CORS политикой'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-AMO-Widget-ID', 'X-AMO-Account-ID']
}));

// Парсинг запросов
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Логирование запросов
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method === 'POST' ? req.body : undefined
  });
  next();
});

// Подключение к базе данных и Redis при запуске
async function initializeServices() {
  try {
    await db.connect();
    await redis.connect();
    logger.info('Все сервисы подключены успешно');
  } catch (error) {
    logger.error('Ошибка подключения к сервисам:', error);
    process.exit(1);
  }
}

// Socket.IO для реального времени
io.on('connection', (socket) => {
  logger.info(`Пользователь подключился: ${socket.id}`);

  socket.on('join_chat', (chatId) => {
    socket.join(chatId);
    logger.info(`Пользователь ${socket.id} присоединился к чату ${chatId}`);
  });

  socket.on('leave_chat', (chatId) => {
    socket.leave(chatId);
    logger.info(`Пользователь ${socket.id} покинул чат ${chatId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Пользователь отключился: ${socket.id}`);
  });
});

// Делаем io доступным в других модулях
app.set('socketio', io);

// Статичные файлы
app.use('/uploads', express.static('uploads'));

// API маршруты
app.use('/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/amo', amoRoutes);
app.use('/webhook', webhookRoutes);

// Виджет для AMO CRM
app.get('/widget', (req, res) => {
  res.sendFile(__dirname + '/widget/index.html');
});

app.use('/widget', express.static('widget'));

// Обработка ошибок
app.use((err, req, res, next) => {
  logger.error('Необработанная ошибка:', err);
  res.status(500).json({
    error: 'Внутренняя ошибка сервера',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 обработчик
app.use((req, res) => {
  res.status(404).json({
    error: 'Маршрут не найден',
    path: req.path
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, async () => {
  await initializeServices();
  logger.info(`Сервер запущен на порту ${PORT}`);
  logger.info(`Окружение: ${process.env.NODE_ENV}`);
  logger.info(`WebSocket сервер готов к подключениям`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Получен SIGTERM, завершение работы...');
  server.close(async () => {
    await db.disconnect();
    await redis.disconnect();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('Получен SIGINT, завершение работы...');
  server.close(async () => {
    await db.disconnect();
    await redis.disconnect();
    process.exit(0);
  });
});

module.exports = app;
