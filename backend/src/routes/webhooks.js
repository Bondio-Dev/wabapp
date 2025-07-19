const express = require('express');
const router = express.Router();
const db = require('../db/database');
const amo = require('../integrations/amo');
const logger = require('../utils/logger');

// Webhook для получения сообщений от Gupshup
router.post('/gupshup', async (req, res) => {
  try {
    const { type, payload } = req.body;

    logger.info('Получен webhook от Gupshup:', { type, payload });

    if (type === 'message') {
      const { source, message } = payload;

      // Находим или создаем контакт
      let contact = await db.query('SELECT * FROM contacts WHERE phone = $1', [source]);
      if (contact.rows.length === 0) {
        const result = await db.query(
          'INSERT INTO contacts (phone) VALUES ($1) RETURNING *',
          [source]
        );
        contact = result;
      }

      const contactId = contact.rows[0].id;

      // Сохраняем входящее сообщение
      await db.query(
        `INSERT INTO messages (contact_id, message_text, message_type, direction, status) 
         VALUES ($1, $2, $3, $4, $5)`,
        [contactId, message.text || message.caption || '', message.type || 'text', 'incoming', 'received']
      );

      // Отправляем через WebSocket
      const io = req.app.get('socketio');
      if (io) {
        io.emit('message_received', {
          contactId,
          phone: source,
          message: message.text || message.caption || '',
          type: message.type || 'text'
        });
      }

      // Пробуем создать контакт в AMO CRM
      try {
        if (!contact.rows[0].amo_contact_id) {
          const amoContact = await amo.createContact(source, contact.rows[0].name);
          if (amoContact) {
            await db.query(
              'UPDATE contacts SET amo_contact_id = $1 WHERE id = $2',
              [amoContact.id, contactId]
            );
            logger.info('Контакт синхронизирован с AMO CRM:', amoContact.id);
          }
        }
      } catch (amoError) {
        logger.error('Ошибка синхронизации с AMO CRM:', amoError);
      }
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Ошибка обработки webhook Gupshup:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка обработки webhook' 
    });
  }
});

// Webhook для AMO CRM
router.post('/amo', async (req, res) => {
  try {
    logger.info('Получен webhook от AMO CRM:', req.body);

    // Здесь можно обработать события AMO CRM
    // Например, изменение статуса сделки, создание контакта и т.д.

    res.json({ success: true });
  } catch (error) {
    logger.error('Ошибка обработки webhook AMO CRM:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка обработки webhook' 
    });
  }
});

module.exports = router;
