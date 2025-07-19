const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const logger = require('../services/logger');
const redis = require('../services/redis');

// Базовая структура пользователя (можно расширить)
const DEFAULT_USERS = [
  {
    id: 1,
    username: 'admin',
    password: '$2a$10$8K1p/A2J3VYHJtE.VMV5QufT/gCt2oFnPbcuEqkMKlqYovNZqA4Oa', // password: admin123
    role: 'admin',
    name: 'Администратор'
  }
];

// Вход в систему
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Требуются username и password'
      });
    }

    // Находим пользователя
    const user = DEFAULT_USERS.find(u => u.username === username);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Неверные учетные данные'
      });
    }

    // Проверяем пароль
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Неверные учетные данные'
      });
    }

    // Создаем JWT токен
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role
      },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '24h' }
    );

    // Сохраняем сессию в Redis
    const sessionId = `session_${user.id}_${Date.now()}`;
    await redis.setSession(sessionId, {
      userId: user.id,
      username: user.username,
      role: user.role,
      loginTime: new Date()
    }, 86400); // 24 часа

    logger.info('Пользователь вошел в систему', {
      username,
      userId: user.id,
      sessionId
    });

    res.json({
      success: true,
      token,
      sessionId,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name
      }
    });

  } catch (error) {
    logger.error('Ошибка входа в систему:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка сервера при входе в систему'
    });
  }
});

// Выход из системы
router.post('/logout', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (sessionId) {
      await redis.deleteSession(sessionId);
      logger.info('Пользователь вышел из системы', { sessionId });
    }

    res.json({
      success: true,
      message: 'Успешный выход из системы'
    });

  } catch (error) {
    logger.error('Ошибка выхода из системы:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при выходе из системы'
    });
  }
});

// Проверка токена
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// Middleware для проверки токена
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Токен доступа не предоставлен'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'default-secret', (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Недействительный токен'
      });
    }

    req.user = user;
    next();
  });
}

// Создание хеша пароля (вспомогательная функция для разработки)
router.post('/hash-password', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Не найдено' });
  }

  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Требуется пароль' });
  }

  const hash = await bcrypt.hash(password, 10);
  res.json({ hash });
});

module.exports = { router, authenticateToken };
