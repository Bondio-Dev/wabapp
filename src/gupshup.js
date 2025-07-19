const axios = require('axios');

class GupshupService {
    constructor() {
        this.apiKey = process.env.GUPSHUP_API_KEY;
        this.appName = process.env.GUPSHUP_APP_NAME;
        this.sourceNumber = process.env.GUPSHUP_SOURCE_NUMBER || this.appName;
        this.baseURL = 'https://api.gupshup.io/sm/api/v1';

        if (!this.apiKey || !this.appName) {
            console.warn('⚠️  Gupshup API Key или App Name не настроены');
        }

        // Создаем axios instance с настройками
        this.client = axios.create({
            timeout: 30000,
            headers: {
                'apikey': this.apiKey,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            }
        });
    }

    // Форматирование номера телефона
    formatPhoneNumber(phone) {
        let cleaned = phone.replace(/[^\d]/g, '');

        // Если номер начинается с 8, заменяем на 7
        if (cleaned.startsWith('8') && cleaned.length === 11) {
            cleaned = '7' + cleaned.substring(1);
        }

        // Если номер не начинается с 7, добавляем 7
        if (!cleaned.startsWith('7') && cleaned.length === 10) {
            cleaned = '7' + cleaned;
        }

        return cleaned;
    }

    // Отправка текстового сообщения
    async sendMessage(phone, message) {
        try {
            if (!this.apiKey || !this.appName) {
                throw new Error('Gupshup API не настроен - проверьте GUPSHUP_API_KEY и GUPSHUP_APP_NAME');
            }

            const formattedPhone = this.formatPhoneNumber(phone);
            console.log(`📤 Отправка сообщения на ${formattedPhone}: ${message.substring(0, 50)}...`);

            const data = new URLSearchParams({
                channel: 'whatsapp',
                source: this.sourceNumber,
                destination: formattedPhone,
                message: JSON.stringify({
                    type: 'text',
                    text: message
                }),
                'src.name': this.appName
            });

            const response = await this.client.post(`${this.baseURL}/msg`, data);

            if (response.status >= 200 && response.status < 300) {
                console.log(`✅ Сообщение отправлено успешно:`, response.data);
                return {
                    success: true,
                    messageId: response.data?.messageId || response.data?.id,
                    status: response.data?.status,
                    data: response.data
                };
            } else {
                throw new Error(`HTTP ${response.status}: ${response.data?.message || 'Неизвестная ошибка'}`);
            }

        } catch (error) {
            console.error(`❌ Ошибка отправки сообщения на ${phone}:`, {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });

            return {
                success: false,
                error: error.response?.data?.message || error.message,
                status: error.response?.status
            };
        }
    }

    // Отправка медиа файла
    async sendMedia(phone, mediaUrl, caption = '', mediaType = 'image') {
        try {
            if (!this.apiKey || !this.appName) {
                throw new Error('Gupshup API не настроен');
            }

            const formattedPhone = this.formatPhoneNumber(phone);
            console.log(`📤 Отправка ${mediaType} на ${formattedPhone}: ${mediaUrl}`);

            let messagePayload;
            if (mediaType === 'image') {
                messagePayload = {
                    type: 'image',
                    originalUrl: mediaUrl,
                    previewUrl: mediaUrl,
                    caption: caption
                };
            } else if (mediaType === 'document') {
                messagePayload = {
                    type: 'file',
                    url: mediaUrl,
                    filename: caption || 'document'
                };
            } else if (mediaType === 'video') {
                messagePayload = {
                    type: 'video',
                    url: mediaUrl,
                    caption: caption
                };
            }

            const data = new URLSearchParams({
                channel: 'whatsapp',
                source: this.sourceNumber,
                destination: formattedPhone,
                message: JSON.stringify(messagePayload),
                'src.name': this.appName
            });

            const response = await this.client.post(`${this.baseURL}/msg`, data);

            if (response.status >= 200 && response.status < 300) {
                console.log(`✅ Медиа файл отправлен успешно:`, response.data);
                return {
                    success: true,
                    messageId: response.data?.messageId || response.data?.id,
                    data: response.data
                };
            } else {
                throw new Error(`HTTP ${response.status}: ${response.data?.message}`);
            }

        } catch (error) {
            console.error(`❌ Ошибка отправки медиа на ${phone}:`, error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }

    // Получение списка шаблонов
    async getTemplates() {
        try {
            const response = await this.client.get(`${this.baseURL}/template/list/${this.appName}`);
            return {
                success: true,
                templates: response.data?.templates || []
            };
        } catch (error) {
            console.error('❌ Ошибка получения шаблонов:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Opt-in пользователя (требуется для некоторых аккаунтов)
    async optInUser(phone) {
        try {
            const formattedPhone = this.formatPhoneNumber(phone);

            const data = new URLSearchParams({
                user: formattedPhone
            });

            const response = await this.client.post(`${this.baseURL}/app/opt/in/${this.appName}`, data);

            return {
                success: response.status >= 200 && response.status < 300,
                data: response.data
            };
        } catch (error) {
            console.error(`❌ Ошибка opt-in для ${phone}:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Проверка статуса сообщения
    async getMessageStatus(messageId) {
        try {
            const response = await this.client.get(`${this.baseURL}/msg/${messageId}`);
            return {
                success: true,
                status: response.data
            };
        } catch (error) {
            console.error(`❌ Ошибка получения статуса сообщения ${messageId}:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Парсинг входящего webhook от Gupshup
    parseIncomingWebhook(webhookBody) {
        try {
            const { type, payload } = webhookBody;

            if (type === 'message' && payload) {
                return {
                    type: 'message',
                    phone: payload.source,
                    message: payload.payload?.text || '',
                    timestamp: payload.timestamp,
                    messageId: payload.id,
                    isValid: true
                };
            } else if (type === 'message-event' && payload) {
                return {
                    type: 'status',
                    phone: payload.destination,
                    status: payload.payload?.status,
                    timestamp: payload.timestamp,
                    messageId: payload.payload?.gsId,
                    isValid: true
                };
            }

            return { isValid: false, raw: webhookBody };
        } catch (error) {
            console.error('❌ Ошибка парсинга webhook:', error.message);
            return { isValid: false, error: error.message };
        }
    }
}

module.exports = new GupshupService();
