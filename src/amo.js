const axios = require('axios');
const fs = require('fs');
const path = require('path');

class AmoService {
    constructor() {
        this.subdomain = process.env.AMO_SUBDOMAIN;
        this.clientId = process.env.AMO_CLIENT_ID;
        this.clientSecret = process.env.AMO_CLIENT_SECRET;
        this.redirectUri = process.env.AMO_REDIRECT_URI || `http://localhost:${process.env.PORT || 3001}/api/amo/callback`;
        this.apiBaseURL = `https://${this.subdomain}.amocrm.ru/api/v4`;
        this.authBaseURL = `https://www.amocrm.ru/oauth`;                       // ++ изменено на www.amocrm.ru
        this.tokenURL    = `https://${this.subdomain}.amocrm.ru/oauth2/access_token`;

        this.accessToken  = process.env.AMO_ACCESS_TOKEN;
        this.refreshToken = process.env.AMO_REFRESH_TOKEN;

        if (!this.subdomain || !this.clientId || !this.clientSecret) {
            console.warn('⚠️ amoCRM: проверьте AMO_SUBDOMAIN, AMO_CLIENT_ID, AMO_CLIENT_SECRET');
        }

        this.client = axios.create({
            baseURL: this.apiBaseURL,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'WhatsApp-AmoCRM-Integration/1.0'
            }
        });

        this.client.interceptors.request.use(config => {
            if (this.accessToken) {
                config.headers.Authorization = `Bearer ${this.accessToken}`;
            }
            return config;
        });

        this.client.interceptors.response.use(
            response => response,
            async error => {
                const original = error.config;
                if (error.response?.status === 401 && !original._retry && this.refreshToken) {
                    original._retry = true;
                    console.log('🔄 amoCRM: access_token истёк, обновляем');
                    const refreshed = await this.refreshAccessToken();
                    if (refreshed.success) {
                        original.headers.Authorization = `Bearer ${this.accessToken}`;
                        return this.client.request(original);
                    }
                }
                return Promise.reject(error);
            }
        );
    }

    // Генерация URL для OAuth авторизации
    getAuthUrl() {
        if (!this.clientId) {
            throw new Error('amoCRM: неполный clientId для OAuth');
        }
        const params = new URLSearchParams({
            client_id:     this.clientId,
            redirect_uri:  this.redirectUri,
            response_type: 'code',
            state:         'whatsapp_integration_' + Date.now()
        });
        return `${this.authBaseURL}?${params.toString()}`;
    }

    // Обмен authorization code на токены
    async exchangeCodeForTokens(code) {
        try {
            console.log('🔑 amoCRM: обмениваем code на токены...');
            const payload = {
                client_id:     this.clientId,
                client_secret: this.clientSecret,
                grant_type:    'authorization_code',
                code,
                redirect_uri:  this.redirectUri
            };
            const resp = await axios.post(this.tokenURL, payload, {
                headers: { 'Content-Type': 'application/json' }
            });
            const data = resp.data;
            if (!data.access_token) {
                throw new Error('amoCRM: access_token не получен');
            }
            this.accessToken  = data.access_token;
            this.refreshToken = data.refresh_token;
            await this.updateEnvFile({
                AMO_ACCESS_TOKEN:  this.accessToken,
                AMO_REFRESH_TOKEN: this.refreshToken
            });
            console.log('✅ amoCRM: токены сохранены');
            return {
                success:       true,
                access_token:  data.access_token,
                refresh_token: data.refresh_token,
                expires_in:    data.expires_in
            };
        } catch (err) {
            console.error('❌ amoCRM exchangeCode:', err.response?.data || err.message);
            return {
                success: false,
                error:   err.response?.data?.hint || err.message
            };
        }
    }

    // Обновление access_token по refresh_token
    async refreshAccessToken() {
        try {
            if (!this.refreshToken) throw new Error('amoCRM: no refresh_token');
            const payload = {
                client_id:     this.clientId,
                client_secret: this.clientSecret,
                grant_type:    'refresh_token',
                refresh_token: this.refreshToken,
                redirect_uri:  this.redirectUri
            };
            const resp = await axios.post(this.tokenURL, payload, {
                headers: { 'Content-Type': 'application/json' }
            });
            const data = resp.data;
            if (!data.access_token) throw new Error('amoCRM: refresh failed');
            this.accessToken  = data.access_token;
            this.refreshToken = data.refresh_token;
            await this.updateEnvFile({
                AMO_ACCESS_TOKEN:  this.accessToken,
                AMO_REFRESH_TOKEN: this.refreshToken
            });
            console.log('✅ amoCRM: токены обновлены');
            return { success: true };
        } catch (err) {
            console.error('❌ amoCRM refreshAccessToken:', err.response?.data || err.message);
            return { success: false, error: err.message };
        }
    }

    // Поиск контакта по телефону
    async findContactByPhone(phone) {
        try {
            const formatted = phone.replace(/\D/g, '');
            const resp = await this.client.get('/contacts', {
                params: { query: formatted, limit: 1 }
            });
            const contacts = resp.data._embedded?.contacts;
            return contacts && contacts.length > 0 ? contacts[0] : null;
        } catch (err) {
            console.error('❌ amoCRM findContactByPhone:', err.response?.data || err.message);
            return null;
        }
    }

    // Создание контакта
    async createContact(phone, name = null) {
        try {
            const formatted = phone.replace(/\D/g, '');
            const contactName = name || `WhatsApp +${formatted}`;
            const contactData = {
                name: contactName,
                custom_fields_values: [
                    {
                        field_code: 'PHONE',
                        values: [{ value: formatted, enum_code: 'WORK' }]
                    }
                ],
                tags: [{ name: 'WhatsApp' }]
            };
            const resp = await this.client.post('/contacts', [contactData]);
            const contacts = resp.data._embedded?.contacts;
            if (contacts && contacts.length > 0) return contacts[0];
            throw new Error('Контакт не создался');
        } catch (err) {
            console.error('❌ amoCRM createContact:', err.response?.data || err.message);
            throw err;
        }
    }

    // Поиск или создание сделки
    async findOrCreateLead(contactId, phone) {
        try {
            const resp = await this.client.get('/leads', {
                params: { 'filter[contacts][0]': contactId, limit: 1 }
            });
            const leads = resp.data._embedded?.leads;
            if (leads && leads.length > 0) return leads[0];
            const leadData = {
                name:     `WhatsApp диалог +${phone.replace(/\D/g, '')}`,
                price:    0,
                contacts: { id: contactId },
                tags:     [{ name: 'WhatsApp' }]
            };
            const createResp = await this.client.post('/leads', [leadData]);
            const newLeads = createResp.data._embedded?.leads;
            if (newLeads && newLeads.length > 0) return newLeads[0];
            throw new Error('Сделка не создалась');
        } catch (err) {
            console.error('❌ amoCRM findOrCreateLead:', err.response?.data || err.message);
            throw err;
        }
    }

    // Добавление примечания
    async addNote(contactId, leadId, text) {
        try {
            const noteData = { note_type: 4, params: { text } };
            if (leadId) {
                noteData.entity_id   = leadId;
                noteData.entity_type = 'leads';
            } else {
                noteData.entity_id   = contactId;
                noteData.entity_type = 'contacts';
            }
            const resp = await this.client.post('/notes', [noteData]);
            return resp.data._embedded?.notes?.[0] || null;
        } catch (err) {
            console.error('❌ amoCRM addNote:', err.response?.data || err.message);
            throw err;
        }
    }

    // Обработка входящего сообщения
    async processIncomingMessage(phone, message) {
        try {
            let contact = await this.findContactByPhone(phone);
            if (!contact) contact = await this.createContact(phone);
            const lead = await this.findOrCreateLead(contact.id, phone);
            const note = `📥 WhatsApp: ${message}`;
            await this.addNote(contact.id, lead.id, note);
            return { success: true };
        } catch (err) {
            console.error('❌ amoCRM processIncomingMessage:', err.message);
            return { success: false, error: err.message };
        }
    }

    // Добавление исходящего сообщения
    async addMessageToContact(phone, message) {
        try {
            let contact = await this.findContactByPhone(phone);
            if (!contact) contact = await this.createContact(phone);
            const lead = await this.findOrCreateLead(contact.id, phone);
            const note = `📤 WhatsApp: ${message}`;
            await this.addNote(contact.id, lead.id, note);
            return { success: true };
        } catch (err) {
            console.error('❌ amoCRM addMessageToContact:', err.message);
            return { success: false, error: err.message };
        }
    }

    // Обновление .env файла
    async updateEnvFile(vars) {
        try {
            const envPath = path.join(process.cwd(), '.env');
            let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
            for (const [k, v] of Object.entries(vars)) {
                const regex = new RegExp(`^${k}=.*`, 'm');
                if (regex.test(content)) {
                    content = content.replace(regex, `${k}=${v}`);
                } else {
                    content += `\n${k}=${v}`;
                }
            }
            fs.writeFileSync(envPath, content.trim() + '\n');
            Object.assign(process.env, vars);
        } catch (err) {
            console.error('❌ amoCRM updateEnvFile:', err.message);
        }
    }

    // Тест подключения к API amoCRM
    async testConnection() {
        try {
            if (!this.accessToken) {
                return { success: false, error: 'AMO_ACCESS_TOKEN не задан' };
            }
            const resp = await this.client.get('/account');
            return { success: true, account: resp.data.name };
        } catch (err) {
            return { success: false, error: err.response?.data?.status || err.message };
        }
    }
}

module.exports = new AmoService();
