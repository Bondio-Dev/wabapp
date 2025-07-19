const axios = require('axios');
const redis = require('../services/redis');
const logger = require('../services/logger');

class AmoCRMService {
  constructor() {
    this.subdomain = process.env.AMO_SUBDOMAIN;
    this.clientId = process.env.AMO_CLIENT_ID;
    this.clientSecret = process.env.AMO_CLIENT_SECRET;
    this.accessToken = process.env.AMO_ACCESS_TOKEN;
    this.refreshToken = process.env.AMO_REFRESH_TOKEN;
    this.pipelineId = process.env.AMO_PIPELINE_ID;
    this.statusId = process.env.AMO_STATUS_ID;
    this.userId = process.env.AMO_USER_ID;

    this.baseURL = `https://${this.subdomain}.amocrm.ru/api/v4`;

    this.axios = axios.create({
      baseURL: this.baseURL,
      timeout: parseInt(process.env.API_TIMEOUT) || 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Автоматическое обновление токена при 401 ошибке
    this.axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          logger.warn('Токен AMO CRM истек, обновляем...');
          const newToken = await this.refreshAccessToken();
          if (newToken) {
            error.config.headers.Authorization = `Bearer ${newToken}`;
            return this.axios.request(error.config);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Обновление access token
  async refreshAccessToken() {
    try {
      const response = await axios.post(`https://${this.subdomain}.amocrm.ru/oauth2/access_token`, {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        redirect_uri: process.env.AMO_REDIRECT_URI
      });

      const { access_token, refresh_token } = response.data;

      this.accessToken = access_token;
      this.refreshToken = refresh_token;

      // Кэшируем токен в Redis
      await redis.setAmoToken(access_token, 86400);

      logger.info('AMO CRM токен успешно обновлен');
      return access_token;
    } catch (error) {
      logger.error('Ошибка обновления токена AMO CRM:', error.response?.data || error.message);
      return null;
    }
  }

  // Получение текущего токена
  async getValidToken() {
    // Сначала пробуем из кэша
    let token = await redis.getAmoToken();
    if (token) {
      this.accessToken = token;
      return token;
    }

    // Если нет в кэше, используем из переменных окружения
    if (this.accessToken) {
      await redis.setAmoToken(this.accessToken, 86400);
      return this.accessToken;
    }

    // Если токена нет, пробуем обновить
    return await this.refreshAccessToken();
  }

  // Установка заголовка авторизации
  async setAuthHeader() {
    const token = await this.getValidToken();
    if (token) {
      this.axios.defaults.headers.Authorization = `Bearer ${token}`;
      return true;
    }
    return false;
  }

  // Поиск контакта по номеру телефона
  async findContactByPhone(phoneNumber) {
    try {
      await this.setAuthHeader();

      // Форматируем номер телефона
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      const response = await this.axios.get('/contacts', {
        params: {
          query: formattedPhone,
          limit: 10
        }
      });

      const contacts = response.data._embedded?.contacts || [];

      // Ищем точное совпадение по телефону
      for (const contact of contacts) {
        const phones = contact.custom_fields_values?.find(field => field.field_code === 'PHONE')?.values || [];
        for (const phone of phones) {
          if (this.normalizePhone(phone.value) === this.normalizePhone(phoneNumber)) {
            logger.info('Найден контакт AMO CRM по телефону', {
              contactId: contact.id,
              phoneNumber,
              contactName: contact.name
            });
            return contact;
          }
        }
      }

      return null;
    } catch (error) {
      logger.error('Ошибка поиска контакта в AMO CRM:', error.response?.data || error.message);
      return null;
    }
  }

  // Создание нового контакта
  async createContact(contactData) {
    try {
      await this.setAuthHeader();

      const newContact = [{
        name: contactData.name || `Контакт ${contactData.phoneNumber}`,
        custom_fields_values: [
          {
            field_code: 'PHONE',
            values: [{
              value: contactData.phoneNumber,
              enum_code: 'WORK'
            }]
          }
        ]
      }];

      if (contactData.email) {
        newContact[0].custom_fields_values.push({
          field_code: 'EMAIL',
          values: [{
            value: contactData.email,
            enum_code: 'WORK'
          }]
        });
      }

      const response = await this.axios.post('/contacts', newContact);
      const contact = response.data._embedded?.contacts?.[0];

      if (contact) {
        logger.info('Создан новый контакт в AMO CRM', {
          contactId: contact.id,
          phoneNumber: contactData.phoneNumber,
          name: contactData.name
        });
      }

      return contact;
    } catch (error) {
      logger.error('Ошибка создания контакта в AMO CRM:', error.response?.data || error.message);
      return null;
    }
  }

  // Поиск или создание контакта
  async findOrCreateContact(phoneNumber, name = null) {
    let contact = await this.findContactByPhone(phoneNumber);

    if (!contact) {
      contact = await this.createContact({
        phoneNumber,
        name: name || `Контакт WhatsApp ${phoneNumber}`
      });
    }

    return contact;
  }

  // Создание сделки
  async createLead(leadData) {
    try {
      await this.setAuthHeader();

      const newLead = [{
        name: leadData.name || `Сделка WhatsApp ${leadData.phoneNumber}`,
        price: leadData.price || 0,
        pipeline_id: parseInt(this.pipelineId),
        status_id: parseInt(this.statusId),
        responsible_user_id: parseInt(this.userId),
        custom_fields_values: []
      }];

      // Добавляем описание если есть
      if (leadData.description) {
        newLead[0].custom_fields_values.push({
          field_code: 'TEXTAREA',
          values: [{
            value: leadData.description
          }]
        });
      }

      // Привязываем контакт если есть
      if (leadData.contactId) {
        newLead[0]._embedded = {
          contacts: [{
            id: leadData.contactId
          }]
        };
      }

      const response = await this.axios.post('/leads', newLead);
      const lead = response.data._embedded?.leads?.[0];

      if (lead) {
        logger.info('Создана новая сделка в AMO CRM', {
          leadId: lead.id,
          contactId: leadData.contactId,
          name: leadData.name
        });
      }

      return lead;
    } catch (error) {
      logger.error('Ошибка создания сделки в AMO CRM:', error.response?.data || error.message);
      return null;
    }
  }

  // Добавление примечания к сделке
  async addNoteToLead(leadId, noteText, noteType = 'common') {
    try {
      await this.setAuthHeader();

      const note = [{
        entity_id: leadId,
        note_type: noteType,
        params: {
          text: noteText
        }
      }];

      const response = await this.axios.post('/leads/notes', note);
      const createdNote = response.data._embedded?.notes?.[0];

      if (createdNote) {
        logger.info('Добавлено примечание к сделке AMO CRM', {
          leadId,
          noteId: createdNote.id
        });
      }

      return createdNote;
    } catch (error) {
      logger.error('Ошибка добавления примечания к сделке AMO CRM:', error.response?.data || error.message);
      return null;
    }
  }

  // Получение информации о сделке
  async getLead(leadId) {
    try {
      await this.setAuthHeader();

      const response = await this.axios.get(`/leads/${leadId}`, {
        params: {
          with: 'contacts'
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Ошибка получения сделки AMO CRM:', error.response?.data || error.message);
      return null;
    }
  }

  // Обновление сделки
  async updateLead(leadId, updateData) {
    try {
      await this.setAuthHeader();

      const response = await this.axios.patch(`/leads/${leadId}`, updateData);
      return response.data;
    } catch (error) {
      logger.error('Ошибка обновления сделки AMO CRM:', error.response?.data || error.message);
      return null;
    }
  }

  // Получение списка воронок
  async getPipelines() {
    try {
      await this.setAuthHeader();

      const response = await this.axios.get('/leads/pipelines');
      return response.data._embedded?.pipelines || [];
    } catch (error) {
      logger.error('Ошибка получения воронок AMO CRM:', error.response?.data || error.message);
      return [];
    }
  }

  // Получение пользователей аккаунта
  async getUsers() {
    try {
      await this.setAuthHeader();

      const response = await this.axios.get('/users');
      return response.data._embedded?.users || [];
    } catch (error) {
      logger.error('Ошибка получения пользователей AMO CRM:', error.response?.data || error.message);
      return [];
    }
  }

  // Форматирование номера телефона для AMO CRM
  formatPhoneNumber(phone) {
    return phone.replace(/[^+\d]/g, '');
  }

  // Нормализация номера телефона для сравнения
  normalizePhone(phone) {
    return phone.replace(/[^\d]/g, '');
  }

  // Обработка входящего сообщения и создание/обновление данных в AMO
  async handleIncomingMessage(messageData) {
    try {
      const { sender, content, messageType } = messageData;

      // Ищем или создаем контакт
      const contact = await this.findOrCreateContact(sender);
      if (!contact) {
        logger.error('Не удалось найти или создать контакт для', sender);
        return null;
      }

      // Создаем сделку если это первое сообщение от контакта
      const existingLeads = await this.findLeadsByContact(contact.id);
      let lead = existingLeads.find(l => l.status_id === parseInt(this.statusId));

      if (!lead) {
        lead = await this.createLead({
          name: `WhatsApp обращение от ${contact.name}`,
          contactId: contact.id,
          phoneNumber: sender,
          description: `Первое сообщение: ${content}`
        });
      }

      // Добавляем сообщение как примечание к сделке
      if (lead) {
        const noteText = `[WhatsApp ${messageType}] ${content}`;
        await this.addNoteToLead(lead.id, noteText);
      }

      return {
        contact,
        lead
      };
    } catch (error) {
      logger.error('Ошибка обработки входящего сообщения в AMO CRM:', error);
      return null;
    }
  }

  // Поиск сделок по контакту
  async findLeadsByContact(contactId) {
    try {
      await this.setAuthHeader();

      const response = await this.axios.get('/leads', {
        params: {
          filter: {
            'contacts': contactId
          }
        }
      });

      return response.data._embedded?.leads || [];
    } catch (error) {
      logger.error('Ошибка поиска сделок по контакту AMO CRM:', error.response?.data || error.message);
      return [];
    }
  }
}

module.exports = new AmoCRMService();
