const express = require('express');
const router = express.Router();
const amo = require('../integrations/amo');
const db = require('../services/database');
const logger = require('../services/logger');

// Получение информации о контакте из AMO CRM
router.get('/contact/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    const contact = await amo.findContactByPhone(phoneNumber);

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Контакт не найден в AMO CRM'
      });
    }

    res.json({
      success: true,
      contact
    });

  } catch (error) {
    logger.error('Ошибка получения контакта из AMO CRM:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка обращения к AMO CRM'
    });
  }
});

// Создание контакта в AMO CRM
router.post('/contact', async (req, res) => {
  try {
    const { phoneNumber, name, email } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Требуется phoneNumber'
      });
    }

    const contact = await amo.createContact({
      phoneNumber,
      name: name || `Контакт ${phoneNumber}`,
      email
    });

    if (!contact) {
      return res.status(400).json({
        success: false,
        error: 'Не удалось создать контакт в AMO CRM'
      });
    }

    // Обновляем информацию в нашей базе
    await db.query(
      'UPDATE contacts SET amo_contact_id = $1 WHERE phone_number = $2',
      [contact.id, phoneNumber]
    );

    res.json({
      success: true,
      contact
    });

  } catch (error) {
    logger.error('Ошибка создания контакта в AMO CRM:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка создания контакта в AMO CRM'
    });
  }
});

// Получение сделки из AMO CRM
router.get('/lead/:leadId', async (req, res) => {
  try {
    const { leadId } = req.params;

    const lead = await amo.getLead(leadId);

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Сделка не найдена в AMO CRM'
      });
    }

    res.json({
      success: true,
      lead
    });

  } catch (error) {
    logger.error('Ошибка получения сделки из AMO CRM:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка обращения к AMO CRM'
    });
  }
});

// Создание сделки в AMO CRM
router.post('/lead', async (req, res) => {
  try {
    const { name, phoneNumber, contactId, price, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Требуется name для сделки'
      });
    }

    const lead = await amo.createLead({
      name,
      phoneNumber,
      contactId,
      price: price || 0,
      description
    });

    if (!lead) {
      return res.status(400).json({
        success: false,
        error: 'Не удалось создать сделку в AMO CRM'
      });
    }

    res.json({
      success: true,
      lead
    });

  } catch (error) {
    logger.error('Ошибка создания сделки в AMO CRM:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка создания сделки в AMO CRM'
    });
  }
});

// Добавление примечания к сделке
router.post('/lead/:leadId/note', async (req, res) => {
  try {
    const { leadId } = req.params;
    const { text, noteType = 'common' } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Требуется text для примечания'
      });
    }

    const note = await amo.addNoteToLead(leadId, text, noteType);

    if (!note) {
      return res.status(400).json({
        success: false,
        error: 'Не удалось добавить примечание'
      });
    }

    res.json({
      success: true,
      note
    });

  } catch (error) {
    logger.error('Ошибка добавления примечания к сделке AMO CRM:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка добавления примечания'
    });
  }
});

// Получение воронок
router.get('/pipelines', async (req, res) => {
  try {
    const pipelines = await amo.getPipelines();

    res.json({
      success: true,
      pipelines
    });

  } catch (error) {
    logger.error('Ошибка получения воронок AMO CRM:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения воронок'
    });
  }
});

// Получение пользователей
router.get('/users', async (req, res) => {
  try {
    const users = await amo.getUsers();

    res.json({
      success: true,
      users
    });

  } catch (error) {
    logger.error('Ошибка получения пользователей AMO CRM:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения пользователей'
    });
  }
});

// Обновление токена AMO CRM
router.post('/refresh-token', async (req, res) => {
  try {
    const newToken = await amo.refreshAccessToken();

    if (!newToken) {
      return res.status(400).json({
        success: false,
        error: 'Не удалось обновить токен'
      });
    }

    res.json({
      success: true,
      message: 'Токен успешно обновлен',
      tokenLength: newToken.length
    });

  } catch (error) {
    logger.error('Ошибка обновления токена AMO CRM:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка обновления токена'
    });
  }
});

// Проверка подключения к AMO CRM
router.get('/test-connection', async (req, res) => {
  try {
    const users = await amo.getUsers();
    const pipelines = await amo.getPipelines();

    res.json({
      success: true,
      message: 'Подключение к AMO CRM работает',
      data: {
        usersCount: users.length,
        pipelinesCount: pipelines.length,
        currentUser: users.find(u => u.id === parseInt(process.env.AMO_USER_ID))?.name
      }
    });

  } catch (error) {
    logger.error('Ошибка проверки подключения к AMO CRM:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка подключения к AMO CRM',
      details: error.message
    });
  }
});

module.exports = router;
