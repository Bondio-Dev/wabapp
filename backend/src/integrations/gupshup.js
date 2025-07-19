const axios = require('axios');
const logger = require('../services/logger');

class GupshupService {
  constructor() {
    this.apiKey = process.env.GUPSHUP_API_KEY;
    this.appName = process.env.GUPSHUP_APP_NAME;
    this.sourceNumber = process.env.GUPSHUP_SOURCE_NUMBER;
    this.baseURL = 'https://api.gupshup.io/sm/api/v1';

    this.axios = axios.create({
      timeout: parseInt(process.env.API_TIMEOUT) || 30000,
      headers: {
        'apikey': this.apiKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
  }

  // Отправка текстового сообщения
  async sendTextMessage(phoneNumber, message) {
    try {
      const data = new URLSearchParams({
        channel: 'whatsapp',
        source: this.sourceNumber,
        destination: phoneNumber,
        message: JSON.stringify({
          type: 'text',
          text: message
        }),
        'src.name': this.appName
      });

      const response = await this.axios.post(`${this.baseURL}/msg`, data);

      logger.info('Сообщение отправлено через Gupshup', {
        phoneNumber,
        messageId: response.data?.messageId,
        status: response.data?.status
      });

      return {
        success: true,
        messageId: response.data?.messageId,
        status: response.data?.status,
        data: response.data
      };
    } catch (error) {
      logger.error('Ошибка отправки сообщения через Gupshup:', error.response?.data || error.message, {
        phoneNumber,
        message
      });

      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Отправка медиа файла
  async sendMediaMessage(phoneNumber, mediaUrl, mediaType = 'image', caption = '') {
    try {
      const messageData = {
        type: mediaType,
        [mediaType]: {
          link: mediaUrl,
          caption: caption
        }
      };

      const data = new URLSearchParams({
        channel: 'whatsapp',
        source: this.sourceNumber,
        destination: phoneNumber,
        message: JSON.stringify(messageData),
        'src.name': this.appName
      });

      const response = await this.axios.post(`${this.baseURL}/msg`, data);

      logger.info('Медиа сообщение отправлено через Gupshup', {
        phoneNumber,
        mediaType,
        messageId: response.data?.messageId
      });

      return {
        success: true,
        messageId: response.data?.messageId,
        data: response.data
      };
    } catch (error) {
      logger.error('Ошибка отправки медиа через Gupshup:', error.response?.data || error.message);

      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Отправка шаблонного сообщения
  async sendTemplateMessage(phoneNumber, templateName, templateParams = []) {
    try {
      const data = new URLSearchParams({
        channel: 'whatsapp',
        source: this.sourceNumber,
        destination: phoneNumber,
        template: JSON.stringify({
          id: templateName,
          params: templateParams
        }),
        'src.name': this.appName
      });

      const response = await this.axios.post(`${this.baseURL}/template/msg`, data);

      logger.info('Шаблонное сообщение отправлено через Gupshup', {
        phoneNumber,
        templateName,
        messageId: response.data?.messageId
      });

      return {
        success: true,
        messageId: response.data?.messageId,
        data: response.data
      };
    } catch (error) {
      logger.error('Ошибка отправки шаблона через Gupshup:', error.response?.data || error.message);

      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Получение статуса сообщения
  async getMessageStatus(messageId) {
    try {
      const response = await this.axios.get(`${this.baseURL}/msg/${messageId}`);

      return {
        success: true,
        status: response.data?.eventType,
        timestamp: response.data?.timestamp,
        data: response.data
      };
    } catch (error) {
      logger.error('Ошибка получения статуса сообщения:', error.response?.data || error.message);

      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Обработка входящего webhook
  processIncomingWebhook(payload) {
    try {
      const { type, payload: data } = payload;

      logger.info('Получен webhook от Gupshup', { type, data });

      switch (type) {
        case 'message':
          return this.processIncomingMessage(data);
        case 'message-event':
          return this.processMessageEvent(data);
        case 'user-event':
          return this.processUserEvent(data);
        default:
          logger.warn('Неизвестный тип webhook от Gupshup:', type);
          return null;
      }
    } catch (error) {
      logger.error('Ошибка обработки webhook от Gupshup:', error);
      return null;
    }
  }

  // Обработка входящего сообщения
  processIncomingMessage(data) {
    return {
      type: 'incoming_message',
      messageId: data.id,
      sender: data.mobile,
      recipient: data.source,
      content: data.message?.text || data.message?.caption || '[Медиа файл]',
      messageType: data.message?.type || 'text',
      timestamp: new Date(parseInt(data.timestamp)),
      gupshupData: data
    };
  }

  // Обработка событий сообщений (статусы доставки)
  processMessageEvent(data) {
    return {
      type: 'message_status',
      messageId: data.gsId,
      externalId: data.externalId,
      status: data.eventType, // sent, delivered, read, failed
      timestamp: new Date(parseInt(data.eventTs)),
      phoneNumber: data.destAddr
    };
  }

  // Обработка пользовательских событий
  processUserEvent(data) {
    return {
      type: 'user_event',
      phoneNumber: data.mobile,
      eventType: data.eventType, // opt-in, opt-out
      timestamp: new Date(parseInt(data.timestamp))
    };
  }

  // Валидация webhook подписи (если настроено)
  validateWebhookSignature(payload, signature, secret) {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return signature === expectedSignature;
  }
}

module.exports = new GupshupService();
