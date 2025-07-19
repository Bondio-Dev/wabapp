const express = require('express');
const router = express.Router();
const db = require('../services/database');
const redis = require('../services/redis');
const logger = require('../services/logger');

// Проверка здоровья системы
router.get('/', async (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: 'unknown',
      redis: 'unknown',
      gupshup: 'unknown',
      amo: 'unknown'
    },
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  };

  let allHealthy = true;

  // Проверка PostgreSQL
  try {
    await db.query('SELECT 1');
    health.services.database = 'OK';
  } catch (error) {
    health.services.database = 'ERROR';
    allHealthy = false;
    logger.error('Health check - Database error:', error);
  }

  // Проверка Redis
  try {
    await redis.get('health_check_key');
    health.services.redis = 'OK';
  } catch (error) {
    health.services.redis = 'ERROR';
    allHealthy = false;
    logger.error('Health check - Redis error:', error);
  }

  // Проверка Gupshup (базовая проверка конфигурации)
  if (process.env.GUPSHUP_API_KEY && process.env.GUPSHUP_APP_NAME) {
    health.services.gupshup = 'OK';
  } else {
    health.services.gupshup = 'NOT_CONFIGURED';
    logger.warn('Health check - Gupshup not configured');
  }

  // Проверка AMO CRM (базовая проверка конфигурации)
  if (process.env.AMO_SUBDOMAIN && process.env.AMO_CLIENT_ID) {
    health.services.amo = 'OK';
  } else {
    health.services.amo = 'NOT_CONFIGURED';
    logger.warn('Health check - AMO CRM not configured');
  }

  if (!allHealthy) {
    health.status = 'DEGRADED';
    res.status(503);
  }

  res.json(health);
});

// Детальная проверка с диагностикой
router.get('/detailed', async (req, res) => {
  const detailed = {
    timestamp: new Date().toISOString(),
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      version: process.version,
      platform: process.platform,
      arch: process.arch
    },
    services: {},
    configuration: {
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
      logLevel: process.env.LOG_LEVEL,
      corsOrigins: process.env.CORS_ORIGINS
    }
  };

  // Детальная проверка базы данных
  try {
    const dbStart = Date.now();
    const dbResult = await db.query('SELECT NOW(), version()');
    const dbTime = Date.now() - dbStart;

    detailed.services.database = {
      status: 'OK',
      responseTime: dbTime,
      serverTime: dbResult.rows[0].now,
      version: dbResult.rows[0].version.split(' ')[0],
      connectionString: process.env.DATABASE_URL ? 'configured' : 'not configured'
    };

    // Проверяем таблицы
    const tablesResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    detailed.services.database.tables = tablesResult.rows.map(r => r.table_name);

  } catch (error) {
    detailed.services.database = {
      status: 'ERROR',
      error: error.message
    };
  }

  // Детальная проверка Redis
  try {
    const redisStart = Date.now();
    await redis.set('health_check', 'test', 60);
    const testValue = await redis.get('health_check');
    const redisTime = Date.now() - redisStart;

    detailed.services.redis = {
      status: 'OK',
      responseTime: redisTime,
      testValue,
      connectionString: process.env.REDIS_URL ? 'configured' : 'not configured'
    };
  } catch (error) {
    detailed.services.redis = {
      status: 'ERROR',
      error: error.message
    };
  }

  res.json(detailed);
});

// Метрики для мониторинга
router.get('/metrics', async (req, res) => {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
    };

    // Получаем статистику из базы данных
    try {
      const statsResult = await db.query(`
        SELECT 
          (SELECT COUNT(*) FROM messages) as total_messages,
          (SELECT COUNT(*) FROM contacts) as total_contacts,
          (SELECT COUNT(*) FROM chats) as total_chats,
          (SELECT COUNT(*) FROM messages WHERE created_at > NOW() - INTERVAL '24 hours') as messages_24h,
          (SELECT COUNT(*) FROM messages WHERE status = 'failed') as failed_messages
      `);

      if (statsResult.rows.length > 0) {
        metrics.database = statsResult.rows[0];
      }
    } catch (error) {
      logger.error('Error getting database metrics:', error);
    }

    res.json(metrics);
  } catch (error) {
    logger.error('Error getting metrics:', error);
    res.status(500).json({
      error: 'Error getting metrics',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
