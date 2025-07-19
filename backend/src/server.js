const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Подключаем модули
const logger = require('./utils/logger');
const db = require('./db/database');
const redis = require('./db/redis');

// Подключаем роуты
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const contactRoutes = require('./routes/contacts');
const webhookRoutes = require('./routes/webhooks');
const amoRoutes = require('./routes/amo');

const app = express();
const server = http.createServer(app);

// Настройка Socket.IO
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ["http://localhost:3000"],
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling']
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ["http://localhost:3000"],
  credentials: true
}));

// Статичные файлы
app.use('/uploads', express.static('uploads'));

// Логирование запросов
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Маршруты API
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/amo', amoRoutes);
app.use('/webhook', webhookRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// Главная страница
app.get('/', (req, res) => {
  res.json({
    message: 'WhatsApp Business API работает!',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api',
      webhook: '/webhook'
    }
  });
});

// WebSocket обработка
const connectedUsers = new Map();

io.on('connection', (socket) => {
  logger.info(`WebSocket подключение: ${socket.id}`);

  connectedUsers.set(socket.id, {
    connectedAt: new Date(),
    rooms: new Set()
  });

  socket.on('join_chat', (chatId) => {
    socket.join(chatId);
    connectedUsers.get(socket.id)?.rooms.add(chatId);
    logger.info(`Пользователь ${socket.id} присоединился к чату ${chatId}`);
    socket.emit('joined_chat', { chatId });
  });

  socket.on('leave_chat', (chatId) => {
    socket.leave(chatId);
    connectedUsers.get(socket.id)?.rooms.delete(chatId);
    logger.info(`Пользователь ${socket.id} покинул чат ${chatId}`);
  });

  socket.on('disconnect', () => {
    connectedUsers.delete(socket.id);
    logger.info(`WebSocket отключение: ${socket.id}`);
  });
});

// Делаем io доступным для других модулей
app.set('socketio', io);

// Обработка ошибок
app.use((err, req, res, next) => {
  logger.error('Ошибка сервера:', err);
  res.status(500).json({
    error: 'Внутренняя ошибка сервера',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Маршрут не найден',
    path: req.path
  });
});

// Запуск сервера
async function startServer() {
  try {
    // Подключаемся к базам данных
    await db.connect();
    logger.info('PostgreSQL подключена');

    await redis.connect();
    logger.info('Redis подключен');

    const PORT = process.env.PORT || 3001;

    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Сервер запущен на порту ${PORT}`);
      logger.info(`🔌 WebSocket готов к подключениям`);
      logger.info(`📊 Режим: ${process.env.NODE_ENV}`);
    });

  } catch (error) {
    logger.error('Ошибка запуска сервера:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Получен SIGTERM, завершение работы...');
  server.close(() => {
    db.disconnect();
    redis.disconnect();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('Получен SIGINT, завершение работы...');
  server.close(() => {
    db.disconnect();
    redis.disconnect();
    process.exit(0);
  });
});

startServer();

module.exports = { app, server, io };
