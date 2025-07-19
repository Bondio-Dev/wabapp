const express = require('express');
const router = express.Router();
const gupshup = require('../integrations/gupshup');
const amo = require('../integrations/amo');
const db = require('../services/database');
const logger = require('../services/logger');
const { v4: uuidv4 } = require('uuid');

// Webhook от Gupshup
router.post('/gupshup', async (req, res) => {
  try {
    logger.info('Получен webhook от Gupshup:', req.body);

    const webhookData = gupshup.processIncomingWebhook(req.body);

    if (!webhookData) {
      return res.status(200).send('OK');
    }

    const io = req.app.get('socketio');

    switch (webhookData.type) {
      case 'incoming_message':
        await handleIncomingMessage(webhookData, io);
        break;

      case 'message_status':
        await handleMessageStatus(webhookData, io);
        break;

      case 'user_event':
        await handleUserEvent(webhookData, io);
        break;
    }

    res.status(200).send('OK');
  } catch (error) {
    logger.error('Ошибка обработки webhook Gupshup:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обработка входящего сообщения
async function handleIncomingMessage(data, io) {
  const { sender, recipient, content, messageType, timestamp, gupshupData } = data;

  // Создаем уникальный ID для чата
  const chatId = `chat_${sender.replace(/[^0-9]/g, '')}`;

  try {
    // Сохраняем сообщение в базу данных
    const messageId = uuidv4();
    const message = await db.createMessage({
      id: messageId,
      chatId,
      sender,
      recipient,
      content,
      messageType,
      status: 'received',
      timestamp,
      gupshupId: data.messageId
    });

    // Создаем или обновляем контакт
    await db.createContact({
      phoneNumber: sender,
      name: gupshupData.senderName || `Контакт ${sender}`,
      lastMessageAt: timestamp,
      chatId
    });

    // Создаем чат если не существует
    await db.createChat({
      id: chatId,
      contactPhone: sender,
      contactName: gupshupData.senderName || `Контакт ${sender}`,
      status: 'active',
      createdAt: timestamp
    }).catch(() => {}); // Игнорируем ошибку если чат уже существует

    // Обрабатываем в AMO CRM
    const amoResult = await amo.handleIncomingMessage({
      sender,
      content,
      messageType,
      timestamp
    });

    if (amoResult?.lead) {
      // Обновляем сообщение с ID сделки AMO
      await db.query(
        'UPDATE messages SET amo_lead_id = $1 WHERE id = $2',
        [amoResult.lead.id, messageId]
      );
    }

    // Отправляем обновление через WebSocket
    io.to(chatId).emit('new_message', {
      ...message,
      amoContact: amoResult?.contact,
      amoLead: amoResult?.lead
    });

    // Уведомляем всех подключенных пользователей о новом сообщении
    io.emit('chat_updated', {
      chatId,
      lastMessage: {
        content,
        timestamp,
        sender,
        messageType
      },
      unreadCount: 1
    });

    logger.info('Входящее сообщение обработано', {
      chatId,
      messageId,
      sender,
      amoContactId: amoResult?.contact?.id,
      amoLeadId: amoResult?.lead?.id
    });

  } catch (error) {
    logger.error('Ошибка обработки входящего сообщения:', error, {
      sender,
      content,
      messageType
    });
  }
}

// Обработка статуса сообщения
async function handleMessageStatus(data, io) {
  const { messageId, status, timestamp, phoneNumber } = data;

  try {
    // Обновляем статус сообщения в базе данных
    await db.updateMessageStatus(messageId, status);

    // Найдем чат для уведомления
    const chatId = `chat_${phoneNumber.replace(/[^0-9]/g, '')}`;

    // Отправляем обновление статуса через WebSocket
    io.to(chatId).emit('message_status_updated', {
      messageId,
      status,
      timestamp
    });

    logger.info('Статус сообщения обновлен', {
      messageId,
      status,
      phoneNumber
    });

  } catch (error) {
    logger.error('Ошибка обновления статуса сообщения:', error, {
      messageId,
      status
    });
  }
}

// Обработка пользовательских событий
async function handleUserEvent(data, io) {
  const { phoneNumber, eventType, timestamp } = data;

  try {
    const chatId = `chat_${phoneNumber.replace(/[^0-9]/g, '')}`;

    // Отправляем уведомление о событии
    io.to(chatId).emit('user_event', {
      phoneNumber,
      eventType,
      timestamp
    });

    logger.info('Пользовательское событие обработано', {
      phoneNumber,
      eventType
    });

  } catch (error) {
    logger.error('Ошибка обработки пользовательского события:', error, {
      phoneNumber,
      eventType
    });
  }
}

// Webhook от AMO CRM (если нужен)
router.post('/amo', async (req, res) => {
  try {
    logger.info('Получен webhook от AMO CRM:', req.body);

    const { leads, contacts } = req.body;
    const io = req.app.get('socketio');

    // Обрабатываем изменения в сделках
    if (leads && leads.status) {
      for (const lead of leads.status) {
        await handleAmoLeadUpdate(lead, io);
      }
    }

    // Обрабатываем изменения в контактах
    if (contacts && contacts.update) {
      for (const contact of contacts.update) {
        await handleAmoContactUpdate(contact, io);
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    logger.error('Ошибка обработки webhook AMO CRM:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

async function handleAmoLeadUpdate(leadData, io) {
  // Обработка обновления сделки от AMO CRM
  logger.info('Обновление сделки от AMO CRM:', leadData);

  // Найдем связанные чаты и уведомим пользователей
  try {
    const messages = await db.query(
      'SELECT DISTINCT chat_id FROM messages WHERE amo_lead_id = $1',
      [leadData.id]
    );

    for (const message of messages.rows) {
      io.to(message.chat_id).emit('amo_lead_updated', leadData);
    }
  } catch (error) {
    logger.error('Ошибка обработки обновления сделки AMO:', error);
  }
}

async function handleAmoContactUpdate(contactData, io) {
  // Обработка обновления контакта от AMO CRM
  logger.info('Обновление контакта от AMO CRM:', contactData);
}

// Тестовый endpoint для проверки webhook'ов
router.post('/test', (req, res) => {
  logger.info('Тестовый webhook вызов:', req.body);
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

module.exports = router;
