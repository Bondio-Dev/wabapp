const express = require('express');
const router = express.Router();
const gupshup = require('../integrations/gupshup');
const amo = require('../integrations/amo');
const db = require('../db/database');
const logger = require('../utils/logger');

// Получить все сообщения
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT m.*, c.name as contact_name, c.phone 
      FROM messages m 
      LEFT JOIN contacts c ON m.contact_id = c.id 
      ORDER BY m.created_at DESC 
      LIMIT 50
    `);

    res.json({
      success: true,
      messages: result.rows
    });
  } catch (error) {
    logger.error('Ошибка получения сообщений:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения сообщений'
    });
  }
});

// Отправить сообщение
router.post('/send', async (req, res) => {
  try {
    const { phone, message, type = 'text' } = req.body;

    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        error: 'Телефон и сообщение обязательны'
      });
    }

    // Находим или создаем контакт
    let contact = await db.query('SELECT * FROM contacts WHERE phone = $1', [phone]);
    if (contact.rows.length === 0) {
      const result = await db.query(
        'INSERT INTO contacts (phone) VALUES ($1) RETURNING *',
        [phone]
      );
      contact = result;
    }

    const contactId = contact.rows[0].id;

    // Отправляем сообщение через Gupshup
    const gupshupResult = await gupshup.sendTextMessage(phone, message);

    if (gupshupResult.success) {
      // Сохраняем в базу данных
      await db.query(
        `INSERT INTO messages (contact_id, message_text, message_type, direction, status, gupshup_message_id) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [contactId, message, type, 'outgoing', 'sent', gupshupResult.messageId]
      );

      // Отправляем через WebSocket
      const io = req.app.get('socketio');
      io.emit('message_sent', {
        contactId,
        phone,
        message,
        messageId: gupshupResult.messageId
      });

      res.json({
        success: true,
        messageId: gupshupResult.messageId,
        message: 'Сообщение отправлено'
      });
    } else {
      res.status(400).json({
        success: false,
        error: gupshupResult.error
      });
    }
  } catch (error) {
    logger.error('Ошибка отправки сообщения:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка отправки сообщения'
    });
  }
});

// Получить сообщения для конкретного контакта
router.get('/contact/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;

    const result = await db.query(
      `SELECT * FROM messages WHERE contact_id = $1 ORDER BY created_at ASC`,
      [contactId]
    );

    res.json({
      success: true,
      messages: result.rows
    });
  } catch (error) {
    logger.error('Ошибка получения сообщений контакта:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения сообщений'
    });
  }
});

module.exports = router;
