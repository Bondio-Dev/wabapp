const axios = require('axios');
const logger = require('../utils/logger');

class GupshupService {
  constructor() {
    this.apiKey = process.env.GUPSHUP_API_KEY;
    this.appName = process.env.GUPSHUP_APP_NAME;
    this.baseURL = 'https://api.gupshup.io/sm/api/v1';
  }

  // Отправка текстового сообщения
  async sendTextMessage(phoneNumber, message) {
    try {
      const data = new URLSearchParams({
        channel: 'whatsapp',
        source: this.appName,
        destination: this.formatPhoneNumber(phoneNumber),
        message: JSON.stringify({
          type: 'text',
          text: message
        }),
        'src.name': this.appName
      });

      const response = await axios.post(`${this.baseURL}/msg`, data, {
        headers: {
          'apikey': this.apiKey,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 30000
      });

      if (response.status === 200) {
        logger.info('Сообщение отправлено через Gupshup:', {
          phoneNumber: this.maskPhoneNumber(phoneNumber),
          messageId: response.data?.messageId,
          status: response.data?.status
        });

        return {
          success: true,
          messageId: response.data?.messageId,
          data: response.data
        };
      }

      return {
        success: false,
        error: response.data?.message || 'Неизвестная ошибка'
      };
    } catch (error) {
      logger.error('Ошибка отправки сообщения через Gupshup:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Отправка изображения
  async sendImageMessage(phoneNumber, imageUrl, caption = '') {
    try {
      const data = new URLSearchParams({
        channel: 'whatsapp',
        source: this.appName,
        destination: this.formatPhoneNumber(phoneNumber),
        message: JSON.stringify({
          type: 'image',
          originalUrl: imageUrl,
          previewUrl: imageUrl,
          caption: caption
        }),
        'src.name': this.appName
      });

      const response = await axios.post(`${this.baseURL}/msg`, data, {
        headers: {
          'apikey': this.apiKey,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 30000
      });

      if (response.status === 200) {
        logger.info('Изображение отправлено через Gupshup:', {
          phoneNumber: this.maskPhoneNumber(phoneNumber),
          messageId: response.data?.messageId
        });

        return {
          success: true,
          messageId: response.data?.messageId,
          data: response.data
        };
      }

      return {
        success: false,
        error: response.data?.message || 'Неизвестная ошибка'
      };
    } catch (error) {
      logger.error('Ошибка отправки изображения через Gupshup:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Форматирование номера телефона
  formatPhoneNumber(phoneNumber) {
    // Убираем все не-цифровые символы
    let formatted = phoneNumber.replace(/[^0-9]/g, '');

    // Добавляем код страны если отсутствует
    if (!formatted.startsWith('7') && !formatted.startsWith('8')) {
      formatted = '7' + formatted;
    }

    // Заменяем 8 на 7 для России
    if (formatted.startsWith('8')) {
      formatted = '7' + formatted.substring(1);
    }

    return formatted;
  }

  // Маскирование номера для логов
  maskPhoneNumber(phoneNumber) {
    const formatted = this.formatPhoneNumber(phoneNumber);
    if (formatted.length > 6) {
      return formatted.substring(0, 3) + '***' + formatted.substring(formatted.length - 3);
    }
    return '***';
  }

  // Получение статуса сообщения
  async getMessageStatus(messageId) {
    try {
      const response = await axios.get(`${this.baseURL}/msg/${messageId}`, {
        headers: {
          'apikey': this.apiKey
        },
        timeout: 15000
      });

      return {
        success: true,
        status: response.data?.status,
        data: response.data
      };
    } catch (error) {
      logger.error('Ошибка получения статуса сообщения:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new GupshupService();
