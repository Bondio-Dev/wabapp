const { Pool } = require('pg');
const logger = require('../utils/logger');

class Database {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'wabapp',
      user: process.env.DB_USER || 'wabapp_user',
      password: process.env.DB_PASSWORD || 'wabapp_password',
      max: 10,
      connectionTimeoutMillis: 30000,
      idleTimeoutMillis: 30000
    });
  }

  async connect() {
    try {
      await this.pool.query('SELECT NOW()');
      logger.info('База данных PostgreSQL подключена');
      await this.initTables();
    } catch (error) {
      logger.error('Ошибка подключения к PostgreSQL:', error);
      throw error;
    }
  }

  async initTables() {
    try {
      // Создаем основные таблицы
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          name VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS contacts (
          id SERIAL PRIMARY KEY,
          phone VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(255),
          amo_contact_id INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          contact_id INTEGER REFERENCES contacts(id),
          message_text TEXT,
          message_type VARCHAR(50) DEFAULT 'text',
          direction VARCHAR(20) CHECK (direction IN ('incoming', 'outgoing')),
          status VARCHAR(50) DEFAULT 'sent',
          gupshup_message_id VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS amo_tokens (
          id SERIAL PRIMARY KEY,
          access_token TEXT NOT NULL,
          refresh_token TEXT NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      logger.info('Таблицы базы данных инициализированы');
    } catch (error) {
      logger.error('Ошибка создания таблиц:', error);
    }
  }

  async query(text, params) {
    try {
      const result = await this.pool.query(text, params);
      return result;
    } catch (error) {
      logger.error('Ошибка выполнения запроса:', error);
      throw error;
    }
  }

  async disconnect() {
    await this.pool.end();
    logger.info('База данных отключена');
  }
}

module.exports = new Database();
