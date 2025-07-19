const express = require('express');
const router = express.Router();
const gupshup = require('../integrations/gupshup');
const db = require('../services/database');
const logger = require('../services/logger');
const { v4: uuidv4 } = require('uuid');

// Получение сообщений чата
router.get('/chat/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const messages = await db.getMessages(chatId, parseInt(limit), parseInt(offset));

    res.json({
      success: true,
      messages: messages.reverse(), // Возвращаем в хронологическом порядке
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: messages.length === parseInt(limit)
      }
    });
  } catch (error) {
    logger.error('Ошибка получения сообщений чата:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения сообщений'
    });
  }
});

// Отправка текстового сообщения
router.post('/send', async (req, res) => {
  try {
    const { phoneNumber, message, chatId } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        error: 'Требуются phoneNumber и message'
      });
    }

    // Отправляем через Gupshup
    const result = await gupshup.sendTextMessage(phoneNumber, message);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    // Сохраняем в базу данных
    const messageId = uuidv4();
    const currentChatId = chatId || `chat_${phoneNumber.replace(/[^0-9]/g, '')}`;

    const savedMessage = await db.createMessage({
      id: messageId,
      chatId: currentChatId,
      sender: process.env.GUPSHUP_SOURCE_NUMBER,
      recipient: phoneNumber,
      content: message,
      messageType: 'text',
      status: 'sent',
      timestamp: new Date(),
      gupshupId: result.messageId
    });

    // Обновляем информацию о контакте
    await db.createContact({
      phoneNumber,
      name: `Контакт ${phoneNumber}`,
      lastMessageAt: new Date(),
      chatId: currentChatId
    });

    // Уведомляем через WebSocket
    const io = req.app.get('socketio');
    io.to(currentChatId).emit('new_message', savedMessage);

    res.json({
      success: true,
      message: savedMessage,
      gupshupResponse: result
    });

    logger.info('Сообщение отправлено', {
      phoneNumber,
      messageId: result.messageId,
      chatId: currentChatId
    });

  } catch (error) {
    logger.error('Ошибка отправки сообщения:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка отправки сообщения'
    });
  }
});

// Отправка медиа файла
router.post('/send-media', async (req, res) => {
  try {
    const { phoneNumber, mediaUrl, mediaType = 'image', caption = '', chatId } = req.body;

    if (!phoneNumber || !mediaUrl) {
      return res.status(400).json({
        success: false,
        error: 'Требуются phoneNumber и mediaUrl'
      });
    }

    // Отправляем через Gupshup
    const result = await gupshup.sendMediaMessage(phoneNumber, mediaUrl, mediaType, caption);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    // Сохраняем в базу данных
    const messageId = uuidv4();
    const currentChatId = chatId || `chat_${phoneNumber.replace(/[^0-9]/g, '')}`;

    const savedMessage = await db.createMessage({
      id: messageId,
      chatId: currentChatId,
      sender: process.env.GUPSHUP_SOURCE_NUMBER,
      recipient: phoneNumber,
      content: caption || `[${mediaType.toUpperCase()}] ${mediaUrl}`,
      messageType: mediaType,
      status: 'sent',
      timestamp: new Date(),
      gupshupId: result.messageId
    });

    // Уведомляем через WebSocket
    const io = req.app.get('socketio');
    io.to(currentChatId).emit('new_message', savedMessage);

    res.json({
      success: true,
      message: savedMessage,
      gupshupResponse: result
    });

  } catch (error) {
    logger.error('Ошибка отправки медиа:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка отправки медиа файла'
    });
  }
});

// Отправка шаблонного сообщения
router.post('/send-template', async (req, res) => {
  try {
    const { phoneNumber, templateName, templateParams = [], chatId } = req.body;

    if (!phoneNumber || !templateName) {
      return res.status(400).json({
        success: false,
        error: 'Требуются phoneNumber и templateName'
      });
    }

    // Отправляем через Gupshup
    const result = await gupshup.sendTemplateMessage(phoneNumber, templateName, templateParams);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    // Сохраняем в базу данных
    const messageId = uuidv4();
    const currentChatId = chatId || `chat_${phoneNumber.replace(/[^0-9]/g, '')}`;

    const savedMessage = await db.createMessage({
      id: messageId,
      chatId: currentChatId,
      sender: process.env.GUPSHUP_SOURCE_NUMBER,
      recipient: phoneNumber,
      content: `[ШАБЛОН: ${templateName}] ${templateParams.join(', ')}`,
      messageType: 'template',
      status: 'sent',
      timestamp: new Date(),
      gupshupId: result.messageId
    });

    // Уведомляем через WebSocket
    const io = req.app.get('socketio');
    io.to(currentChatId).emit('new_message', savedMessage);

    res.json({
      success: true,
      message: savedMessage,
      gupshupResponse: result
    });

  } catch (error) {
    logger.error('Ошибка отправки шаблона:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка отправки шаблонного сообщения'
    });
  }
});

// Получение статуса сообщения
router.get('/status/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;

    const result = await gupshup.getMessageStatus(messageId);

    res.json({
      success: result.success,
      status: result.status,
      timestamp: result.timestamp,
      data: result.data,
      error: result.error
    });

  } catch (error) {
    logger.error('Ошибка получения статуса сообщения:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения статуса сообщения'
    });
  }
});

// Пометить сообщения как прочитанные
router.post('/mark-read', async (req, res) => {
  try {
    const { chatId, messageIds } = req.body;

    if (!chatId) {
      return res.status(400).json({
        success: false,
        error: 'Требуется chatId'
      });
    }

    // Обновляем статус сообщений
    let updatedCount = 0;

    if (messageIds && Array.isArray(messageIds)) {
      // Обновляем конкретные сообщения
      for (const messageId of messageIds) {
        const result = await db.updateMessageStatus(messageId, 'read');
        if (result) updatedCount++;
      }
    } else {
      // Помечаем все непрочитанные сообщения в чате как прочитанные
      const result = await db.query(
        `UPDATE messages SET status = 'read', updated_at = NOW() 
         WHERE chat_id = $1 AND status != 'read' AND sender != $2`,
        [chatId, process.env.GUPSHUP_SOURCE_NUMBER]
      );
      updatedCount = result.rowCount;
    }

    // Уведомляем через WebSocket
    const io = req.app.get('socketio');
    io.to(chatId).emit('messages_read', {
      chatId,
      messageIds: messageIds || 'all',
      updatedCount
    });

    res.json({
      success: true,
      updatedCount
    });

  } catch (error) {
    logger.error('Ошибка пометки сообщений как прочитанные:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка обновления статуса сообщений'
    });
  }
});

module.exports = router;
