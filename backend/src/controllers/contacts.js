const express = require('express');
const router = express.Router();
const db = require('../services/database');
const amo = require('../integrations/amo');
const logger = require('../services/logger');

// Получение списка контактов/чатов
router.get('/', async (req, res) => {
  try {
    const { limit = 100 } = req.query;

    const chats = await db.getChats();

    res.json({
      success: true,
      chats: chats.map(chat => ({
        id: chat.id,
        contactPhone: chat.contact_phone,
        contactName: chat.contact_name || `Контакт ${chat.contact_phone}`,
        lastMessage: chat.last_message,
        lastMessageTime: chat.last_message_time,
        unreadCount: parseInt(chat.unread_count) || 0,
        amoContactId: chat.amo_contact_id,
        status: chat.status
      }))
    });

  } catch (error) {
    logger.error('Ошибка получения списка чатов:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения контактов'
    });
  }
});

// Получение информации о конкретном контакте
router.get('/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    const contact = await db.getContactByPhone(phoneNumber);

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Контакт не найден'
      });
    }

    // Получаем информацию из AMO CRM если есть ID
    let amoContact = null;
    if (contact.amo_contact_id) {
      try {
        amoContact = await amo.getLead(contact.amo_contact_id);
      } catch (error) {
        logger.warn('Ошибка получения контакта из AMO CRM:', error);
      }
    }

    res.json({
      success: true,
      contact: {
        ...contact,
        amoContact
      }
    });

  } catch (error) {
    logger.error('Ошибка получения информации о контакте:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения контакта'
    });
  }
});

// Создание нового контакта
router.post('/', async (req, res) => {
  try {
    const { phoneNumber, name } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Требуется phoneNumber'
      });
    }

    // Создаем контакт в базе данных
    const chatId = `chat_${phoneNumber.replace(/[^0-9]/g, '')}`;

    const contact = await db.createContact({
      phoneNumber,
      name: name || `Контакт ${phoneNumber}`,
      lastMessageAt: new Date(),
      chatId
    });

    // Создаем чат
    await db.createChat({
      id: chatId,
      contactPhone: phoneNumber,
      contactName: name || `Контакт ${phoneNumber}`,
      status: 'active',
      createdAt: new Date()
    }).catch(() => {}); // Игнорируем если уже существует

    // Создаем контакт в AMO CRM
    let amoContact = null;
    try {
      amoContact = await amo.findOrCreateContact(phoneNumber, name);

      if (amoContact) {
        // Обновляем ID AMO в нашей базе
        await db.query(
          'UPDATE contacts SET amo_contact_id = $1 WHERE phone_number = $2',
          [amoContact.id, phoneNumber]
        );
      }
    } catch (error) {
      logger.warn('Ошибка создания контакта в AMO CRM:', error);
    }

    res.json({
      success: true,
      contact: {
        ...contact,
        amo_contact_id: amoContact?.id,
        amoContact
      }
    });

  } catch (error) {
    logger.error('Ошибка создания контакта:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка создания контакта'
    });
  }
});

// Обновление контакта
router.put('/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const { name } = req.body;

    // Обновляем в базе данных
    const result = await db.query(
      'UPDATE contacts SET name = $1, updated_at = NOW() WHERE phone_number = $2 RETURNING *',
      [name, phoneNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Контакт не найден'
      });
    }

    const contact = result.rows[0];

    // Обновляем в AMO CRM если есть связь
    if (contact.amo_contact_id) {
      try {
        await amo.updateContact(contact.amo_contact_id, { name });
      } catch (error) {
        logger.warn('Ошибка обновления контакта в AMO CRM:', error);
      }
    }

    res.json({
      success: true,
      contact
    });

  } catch (error) {
    logger.error('Ошибка обновления контакта:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка обновления контакта'
    });
  }
});

// Поиск контактов
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const { limit = 20 } = req.query;

    const result = await db.query(
      `SELECT * FROM contacts 
       WHERE name ILIKE $1 OR phone_number LIKE $1 
       ORDER BY last_message_at DESC 
       LIMIT $2`,
      [`%${query}%`, parseInt(limit)]
    );

    res.json({
      success: true,
      contacts: result.rows
    });

  } catch (error) {
    logger.error('Ошибка поиска контактов:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка поиска контактов'
    });
  }
});

module.exports = router;
