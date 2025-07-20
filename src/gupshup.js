const axios = require('axios');

class GupshupService {
    constructor() {
        this.apiKey       = process.env.GUPSHUP_API_KEY;
        this.appName      = process.env.GUPSHUP_APP_NAME;
        this.sourceNumber = process.env.GUPSHUP_SOURCE_NUMBER || this.appName;
        this.baseURL      = 'https://api.gupshup.io/sm/api/v1';

        if (!this.apiKey || !this.appName) {
            console.warn('⚠️  Gupshup API Key или App Name не настроены');
        }

        // Создаём axios-инстанс с нужными заголовками
        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: 30000,
            headers: {
                'apikey': this.apiKey,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            }
        });
    }

    // Нормализация номера телефона под формат России
    formatPhoneNumber(phone) {
        let cleaned = phone.replace(/[^\d]/g, '');
        if (cleaned.startsWith('8') && cleaned.length === 11) {
            cleaned = '7' + cleaned.slice(1);
        }
        if (!cleaned.startsWith('7') && cleaned.length === 10) {
            cleaned = '7' + cleaned;
        }
        return cleaned;
    }

    // Отправка текстового сообщения
    async sendMessage(phone, message) {
        if (!this.apiKey || !this.appName) {
            return { success: false, error: 'Gupshup API не настроен' };
        }

        const to = this.formatPhoneNumber(phone);
        console.log(`📤 Отправка текста на ${to}: ${message}`);

        const params = new URLSearchParams({
            channel:     'whatsapp',
            source:      this.sourceNumber,
            destination: to,
            message:     JSON.stringify({ type: 'text', text: message }),
            'src.name':  this.appName
        });

        try {
            const resp = await this.client.post('/msg', params.toString());
            console.log('✅ Gupshup ответ:', resp.data);
            return {
                success:   true,
                messageId: resp.data.messageId || resp.data.id,
                status:    resp.data.status,
                data:      resp.data
            };
        } catch (err) {
            console.error(`❌ Ошибка при отправке текста на ${to}:`, err.response?.data || err.message);
            return {
                success: false,
                error:   err.response?.data?.message || err.message,
                status:  err.response?.status
            };
        }
    }

    // Отправка медиа (image, file, video)
    async sendMedia(phone, mediaUrl, caption = '', mediaType = 'image') {
        if (!this.apiKey || !this.appName) {
            return { success: false, error: 'Gupshup API не настроен' };
        }

        const to = this.formatPhoneNumber(phone);
        console.log(`📤 Отправка ${mediaType} на ${to}: ${mediaUrl}`);

        let payload;
        if (mediaType === 'image') {
            payload = { type: 'image', originalUrl: mediaUrl, previewUrl: mediaUrl, caption };
        } else if (mediaType === 'document') {
            payload = { type: 'file', url: mediaUrl, filename: caption || 'document' };
        } else if (mediaType === 'video') {
            payload = { type: 'video', url: mediaUrl, caption };
        } else {
            return { success: false, error: `Неподдерживаемый mediaType: ${mediaType}` };
        }

        const params = new URLSearchParams({
            channel:     'whatsapp',
            source:      this.sourceNumber,
            destination: to,
            message:     JSON.stringify(payload),
            'src.name':  this.appName
        });

        try {
            const resp = await this.client.post('/msg', params.toString());
            console.log('✅ Gupshup media ответ:', resp.data);
            return {
                success:   true,
                messageId: resp.data.messageId || resp.data.id,
                data:      resp.data
            };
        } catch (err) {
            console.error(`❌ Ошибка при отправке ${mediaType} на ${to}:`, err.response?.data || err.message);
            return {
                success: false,
                error:   err.response?.data?.message || err.message
            };
        }
    }

    // Получить список шаблонов
    async getTemplates() {
        try {
            const resp = await this.client.get(`/template/list/${this.appName}`);
            return { success: true, templates: resp.data.templates || [] };
        } catch (err) {
            console.error('❌ Ошибка получения шаблонов Gupshup:', err.response?.data || err.message);
            return { success: false, error: err.message };
        }
    }

    // Opt-in пользователя (необходимо для некоторых аккаунтов)
    async optInUser(phone) {
        const to = this.formatPhoneNumber(phone);
        const params = new URLSearchParams({ user: to });
        try {
            const resp = await this.client.post(`/app/opt/in/${this.appName}`, params.toString());
            return { success: resp.status >= 200 && resp.status < 300, data: resp.data };
        } catch (err) {
            console.error(`❌ Ошибка opt-in для ${to}:`, err.response?.data || err.message);
            return { success: false, error: err.message };
        }
    }

    // Статус сообщения
    async getMessageStatus(messageId) {
        try {
            const resp = await this.client.get(`/msg/${messageId}`);
            return { success: true, status: resp.data };
        } catch (err) {
            console.error(`❌ Ошибка получения статуса сообщения ${messageId}:`, err.response?.data || err.message);
            return { success: false, error: err.message };
        }
    }

    // Парсинг входящего webhook
    parseIncomingWebhook(body) {
        try {
            const { type, payload } = body;
            if (type === 'message' && payload) {
                return {
                    type:      'message',
                    phone:     payload.source,
                    message:   payload.payload?.text || '',
                    timestamp: payload.timestamp,
                    messageId: payload.id,
                    isValid:   true
                };
            }
            if (type === 'message-event' && payload) {
                return {
                    type:      'status',
                    phone:     payload.destination,
                    status:    payload.payload?.status,
                    timestamp: payload.timestamp,
                    messageId: payload.payload?.gsId,
                    isValid:   true
                };
            }
            return { isValid: false, raw: body };
        } catch (err) {
            console.error('❌ Ошибка парсинга webhook Gupshup:', err.message);
            return { isValid: false, error: err.message };
        }
    }
}

module.exports = new GupshupService();
