const axios = require('axios');
const redis = require('../db/redis');
const logger = require('../utils/logger');

class AmoCrmService {
  constructor() {
    this.subdomain = process.env.AMO_SUBDOMAIN;
    this.clientId = process.env.AMO_CLIENT_ID;
    this.clientSecret = process.env.AMO_CLIENT_SECRET;
    this.baseURL = `https://${this.subdomain}.amocrm.ru/api/v4`;
    this.accessToken = null;
    this.refreshToken = null;
  }

  // Получение токена из кэша или переменных окружения
  async getAccessToken() {
    if (this.accessToken) {
      return this.accessToken;
    }

    // Пробуем получить из Redis
    const cachedToken = await redis.getAmoToken();
    if (cachedToken) {
      this.accessToken = cachedToken;
      return this.accessToken;
    }

    // Если токена нет, нужно пройти OAuth
    logger.warn('AMO CRM токен не найден. Необходима авторизация через /api/amo/auth');
    return null;
  }

  // Обновление access token
  async refreshAccessToken() {
    try {
      if (!this.refreshToken) {
        throw new Error('Refresh token отсутствует');
      }

      const response = await axios.post(`https://${this.subdomain}.amocrm.ru/oauth2/access_token`, {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        redirect_uri: `${process.env.BASE_URL}/auth/amo/callback`
      });

      const { access_token, refresh_token, expires_in } = response.data;

      this.accessToken = access_token;
      this.refreshToken = refresh_token;

      // Кэшируем в Redis
      await redis.setAmoToken(access_token, expires_in - 300); // за 5 минут до истечения

      logger.info('AMO CRM токен успешно обновлен');
      return access_token;
    } catch (error) {
      logger.error('Ошибка обновления AMO CRM токена:', error);
      return null;
    }
  }

  // Выполнение запроса к AMO CRM API
  async makeRequest(method, endpoint, data = null) {
    try {
      const token = await this.getAccessToken();
      if (!token) {
        throw new Error('AMO CRM токен недоступен');
      }

      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      if (data && (method === 'POST' || method === 'PATCH')) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        // Пробуем обновить токен
        logger.info('AMO CRM токен истек, пробуем обновить...');
        const newToken = await this.refreshAccessToken();
        if (newToken) {
          // Повторяем запрос с новым токеном
          return this.makeRequest(method, endpoint, data);
        }
      }

      logger.error('Ошибка запроса к AMO CRM:', error);
      throw error;
    }
  }

  // Создание контакта
  async createContact(phone, name = null) {
    try {
      const contactData = {
        name: name || phone,
        custom_fields_values: [
          {
            field_id: 262101, // ID поля для телефона (может отличаться)
            values: [
              {
                enum_id: 918985, // ID типа телефона (может отличаться)
                value: phone
              }
            ]
          }
        ]
      };

      const response = await this.makeRequest('POST', '/contacts', [contactData]);
      logger.info('Контакт создан в AMO CRM:', response);
      return response._embedded?.contacts?.[0];
    } catch (error) {
      logger.error('Ошибка создания контакта в AMO CRM:', error);
      throw error;
    }
  }

  // Создание сделки
  async createDeal(contactId, name, price = 0) {
    try {
      const dealData = {
        name: name,
        price: price,
        contacts_id: [contactId]
      };

      const response = await this.makeRequest('POST', '/leads', [dealData]);
      logger.info('Сделка создана в AMO CRM:', response);
      return response._embedded?.leads?.[0];
    } catch (error) {
      logger.error('Ошибка создания сделки в AMO CRM:', error);
      throw error;
    }
  }
}

module.exports = new AmoCrmService();
