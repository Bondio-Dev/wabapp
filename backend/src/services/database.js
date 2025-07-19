const { Pool } = require('pg');
const logger = require('./logger');

class DatabaseService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      logger.error('Неожиданная ошибка PostgreSQL клиента:', err);
    });
  }

  async connect() {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      logger.info('Подключение к PostgreSQL успешно:', result.rows[0].now);
      return true;
    } catch (error) {
      logger.error('Ошибка подключения к PostgreSQL:', error);
      throw error;
    }
  }

  async query(text, params) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug(`Выполнен запрос: ${text}`, {
        duration,
        rows: result.rowCount
      });
      return result;
    } catch (error) {
      logger.error('Ошибка выполнения запроса:', error, {
        query: text,
        params
      });
      throw error;
    }
  }

  async disconnect() {
    try {
      await this.pool.end();
      logger.info('Соединение с PostgreSQL закрыто');
    } catch (error) {
      logger.error('Ошибка при закрытии соединения с PostgreSQL:', error);
    }
  }

  // Методы для работы с сообщениями
  async createMessage(messageData) {
    const query = `
      INSERT INTO messages (id, chat_id, sender, recipient, content, message_type, status, timestamp, gupshup_id, amo_lead_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;

    const values = [
      messageData.id,
      messageData.chatId,
      messageData.sender,
      messageData.recipient,
      messageData.content,
      messageData.messageType || 'text',
      messageData.status || 'sent',
      messageData.timestamp || new Date(),
      messageData.gupshupId,
      messageData.amoLeadId
    ];

    const result = await this.query(query, values);
    return result.rows[0];
  }

  async getMessages(chatId, limit = 50, offset = 0) {
    const query = `
      SELECT * FROM messages 
      WHERE chat_id = $1 
      ORDER BY timestamp DESC 
      LIMIT $2 OFFSET $3;
    `;

    const result = await this.query(query, [chatId, limit, offset]);
    return result.rows;
  }

  async updateMessageStatus(messageId, status) {
    const query = `
      UPDATE messages 
      SET status = $1, updated_at = NOW() 
      WHERE id = $2 
      RETURNING *;
    `;

    const result = await this.query(query, [status, messageId]);
    return result.rows[0];
  }

  // Методы для работы с контактами
  async createContact(contactData) {
    const query = `
      INSERT INTO contacts (phone_number, name, amo_contact_id, last_message_at, chat_id)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (phone_number) 
      DO UPDATE SET 
        name = EXCLUDED.name,
        amo_contact_id = EXCLUDED.amo_contact_id,
        last_message_at = EXCLUDED.last_message_at,
        updated_at = NOW()
      RETURNING *;
    `;

    const values = [
      contactData.phoneNumber,
      contactData.name,
      contactData.amoContactId,
      contactData.lastMessageAt || new Date(),
      contactData.chatId
    ];

    const result = await this.query(query, values);
    return result.rows[0];
  }

  async getContacts(limit = 100) {
    const query = `
      SELECT c.*, 
             m.content as last_message,
             m.timestamp as last_message_time
      FROM contacts c
      LEFT JOIN messages m ON m.chat_id = c.chat_id 
        AND m.timestamp = c.last_message_at
      ORDER BY c.last_message_at DESC
      LIMIT $1;
    `;

    const result = await this.query(query, [limit]);
    return result.rows;
  }

  async getContactByPhone(phoneNumber) {
    const query = 'SELECT * FROM contacts WHERE phone_number = $1;';
    const result = await this.query(query, [phoneNumber]);
    return result.rows[0];
  }

  // Методы для работы с чатами
  async createChat(chatData) {
    const query = `
      INSERT INTO chats (id, contact_phone, contact_name, status, created_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;

    const values = [
      chatData.id,
      chatData.contactPhone,
      chatData.contactName,
      chatData.status || 'active',
      chatData.createdAt || new Date()
    ];

    const result = await this.query(query, values);
    return result.rows[0];
  }

  async getChats() {
    const query = `
      SELECT c.*, 
             co.name as contact_name,
             co.amo_contact_id,
             m.content as last_message,
             m.timestamp as last_message_time,
             COUNT(m2.id) FILTER (WHERE m2.status = 'delivered' AND m2.sender != c.contact_phone) as unread_count
      FROM chats c
      LEFT JOIN contacts co ON co.phone_number = c.contact_phone
      LEFT JOIN messages m ON m.chat_id = c.id 
        AND m.timestamp = (SELECT MAX(timestamp) FROM messages WHERE chat_id = c.id)
      LEFT JOIN messages m2 ON m2.chat_id = c.id AND m2.sender != c.contact_phone AND m2.status != 'read'
      GROUP BY c.id, co.name, co.amo_contact_id, m.content, m.timestamp
      ORDER BY COALESCE(m.timestamp, c.created_at) DESC;
    `;

    const result = await this.query(query);
    return result.rows;
  }
}

module.exports = new DatabaseService();
