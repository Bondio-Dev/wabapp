const redis = require('redis');
const logger = require('../utils/logger');

class RedisService {
  constructor() {
    this.client = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });

    this.client.on('error', (err) => {
      logger.error('Redis ошибка:', err);
    });

    this.client.on('connect', () => {
      logger.info('Redis подключен');
    });
  }

  async connect() {
    try {
      await this.client.connect();
      await this.client.ping();
      logger.info('Redis готов к работе');
    } catch (error) {
      logger.error('Ошибка подключения к Redis:', error);
      throw error;
    }
  }

  async set(key, value, expireInSeconds = 3600) {
    try {
      await this.client.setEx(key, expireInSeconds, JSON.stringify(value));
    } catch (error) {
      logger.error('Ошибка записи в Redis:', error);
    }
  }

  async get(key) {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Ошибка чтения из Redis:', error);
      return null;
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error('Ошибка удаления из Redis:', error);
    }
  }

  async setAmoToken(token, expireInSeconds = 86400) {
    await this.set('amo_access_token', token, expireInSeconds);
  }

  async getAmoToken() {
    return await this.get('amo_access_token');
  }

  async disconnect() {
    await this.client.quit();
    logger.info('Redis отключен');
  }
}

module.exports = new RedisService();
