const redis = require('redis');
const logger = require('./logger');

class RedisService {
  constructor() {
    this.client = redis.createClient({
      url: process.env.REDIS_URL,
      retry_delay_on_failover: 100,
      max_attempts: 3
    });

    this.client.on('error', (err) => {
      logger.error('Redis ошибка:', err);
    });

    this.client.on('connect', () => {
      logger.info('Redis подключен');
    });

    this.client.on('ready', () => {
      logger.info('Redis готов к работе');
    });

    this.client.on('end', () => {
      logger.info('Redis соединение закрыто');
    });
  }

  async connect() {
    try {
      await this.client.connect();
      await this.client.ping();
      logger.info('Подключение к Redis успешно');
      return true;
    } catch (error) {
      logger.error('Ошибка подключения к Redis:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await this.client.quit();
      logger.info('Соединение с Redis закрыто');
    } catch (error) {
      logger.error('Ошибка при закрытии соединения с Redis:', error);
    }
  }

  // Кэширование
  async set(key, value, expireInSeconds = 3600) {
    try {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : value;
      await this.client.setEx(key, expireInSeconds, stringValue);
      return true;
    } catch (error) {
      logger.error(`Ошибка записи в Redis для ключа ${key}:`, error);
      return false;
    }
  }

  async get(key) {
    try {
      const value = await this.client.get(key);
      if (!value) return null;

      // Пытаемся парсить как JSON, если не получается - возвращаем строку
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      logger.error(`Ошибка чтения из Redis для ключа ${key}:`, error);
      return null;
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error(`Ошибка удаления из Redis для ключа ${key}:`, error);
      return false;
    }
  }

  async exists(key) {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Ошибка проверки существования ключа ${key}:`, error);
      return false;
    }
  }

  // Сессии
  async setSession(sessionId, sessionData, expireInSeconds = 86400) {
    const key = `session:${sessionId}`;
    return await this.set(key, sessionData, expireInSeconds);
  }

  async getSession(sessionId) {
    const key = `session:${sessionId}`;
    return await this.get(key);
  }

  async deleteSession(sessionId) {
    const key = `session:${sessionId}`;
    return await this.del(key);
  }

  // Кэш AMO токенов
  async setAmoToken(token, expireInSeconds = 86400) {
    return await this.set('amo:access_token', token, expireInSeconds);
  }

  async getAmoToken() {
    return await this.get('amo:access_token');
  }

  // Временное хранение для rate limiting
  async incrementCounter(key, windowSizeInSeconds = 60) {
    try {
      const current = await this.client.incr(key);
      if (current === 1) {
        await this.client.expire(key, windowSizeInSeconds);
      }
      return current;
    } catch (error) {
      logger.error(`Ошибка увеличения счетчика для ключа ${key}:`, error);
      return 0;
    }
  }

  // Очередь сообщений
  async pushToQueue(queueName, message) {
    try {
      await this.client.lPush(queueName, JSON.stringify(message));
      return true;
    } catch (error) {
      logger.error(`Ошибка добавления в очередь ${queueName}:`, error);
      return false;
    }
  }

  async popFromQueue(queueName) {
    try {
      const message = await this.client.rPop(queueName);
      return message ? JSON.parse(message) : null;
    } catch (error) {
      logger.error(`Ошибка извлечения из очереди ${queueName}:`, error);
      return null;
    }
  }

  async getQueueLength(queueName) {
    try {
      return await this.client.lLen(queueName);
    } catch (error) {
      logger.error(`Ошибка получения длины очереди ${queueName}:`, error);
      return 0;
    }
  }
}

module.exports = new RedisService();
