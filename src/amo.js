const axios = require('axios');
const fs = require('fs');
const path = require('path');

class AmoService {
    constructor() {
        this.subdomain = process.env.AMO_SUBDOMAIN;
        this.clientId = process.env.AMO_CLIENT_ID;
        this.clientSecret = process.env.AMO_CLIENT_SECRET;
        this.redirectUri = process.env.AMO_REDIRECT_URI || `http://localhost:${process.env.PORT || 3001}/api/amo/callback`;
        this.baseURL = `https://${this.subdomain}.amocrm.ru/api/v4`;
        this.authURL = `https://${this.subdomain}.amocrm.ru/oauth`;

        this.accessToken = process.env.AMO_ACCESS_TOKEN;
        this.refreshToken = process.env.AMO_REFRESH_TOKEN;

        if (!this.subdomain || !this.clientId || !this.clientSecret) {
            console.warn('⚠️  amoCRM настройки неполные - проверьте AMO_SUBDOMAIN, AMO_CLIENT_ID, AMO_CLIENT_SECRET');
        }

        // Создаем axios client для API запросов
        this.client = axios.create({
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'WhatsApp-AmoCRM-Integration/1.0'
            }
        });

        // Добавляем автоматическое обновление токенов
        this.client.interceptors.request.use(async (config) => {
            if (this.accessToken) {
                config.headers.Authorization = `Bearer ${this.accessToken}`;
            }
            return config;
        });

        this.client.interceptors.response.use(
            (response) => response,
            async (error) => {
                const originalRequest = error.config;

                if (error.response?.status === 401 && !originalRequest._retry && this.refreshToken) {
                    originalRequest._retry = true;

                    console.log('🔄 Токен истёк, обновляем...');
                    const newTokens = await this.refreshAccessToken();

                    if (newTokens.success) {
                        originalRequest.headers.Authorization = `Bearer ${this.accessToken}`;
                        return this.client.request(originalRequest);
                    }
                }

                return Promise.reject(error);
            }
        );
    }

    // Генерация URL для OAuth авторизации
    getAuthUrl() {
        if (!this.subdomain || !this.clientId) {
            throw new Error('Настройки amoCRM неполные для генерации URL авторизации');
        }

        const params = new URLSearchParams({
            client_id: this.clientId,
            response_type: 'code',
            redirect_uri: this.redirectUri,
            scope: 'crm',
            state: 'whatsapp_integration_' + Date.now()
        });

        return `${this.authURL}?${params.toString()}`;
    }

    // Обмен кода на токены
    async exchangeCodeForTokens(code) {
        try {
            console.log('🔑 Обмен кода на токены...');

            const data = {
                client_id: this.clientId,
                client_secret: this.clientSecret,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: this.redirectUri
            };

            const response = await axios.post(`${this.authURL}/access_token`, data, {
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.data.access_token) {
                this.accessToken = response.data.access_token;
                this.refreshToken = response.data.refresh_token;

                // Обновляем .env файл
                await this.updateEnvFile({
                    AMO_ACCESS_TOKEN: this.accessToken,
                    AMO_REFRESH_TOKEN: this.refreshToken
                });

                console.log('✅ Токены получены и сохранены в .env');

                return {
                    success: true,
                    access_token: this.accessToken,
                    refresh_token: this.refreshToken,
                    expires_in: response.data.expires_in
                };
            } else {
                throw new Error('Токены не получены от amoCRM');
            }

        } catch (error) {
            console.error('❌ Ошибка получения токенов:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.hint || error.message
            };
        }
    }

    // Обновление access token
    async refreshAccessToken() {
        try {
            if (!this.refreshToken) {
                throw new Error('Refresh token отсутствует');
            }

            const data = {
                client_id: this.clientId,
                client_secret: this.clientSecret,
                grant_type: 'refresh_token',
                refresh_token: this.refreshToken,
                redirect_uri: this.redirectUri
            };

            const response = await axios.post(`${this.authURL}/access_token`, data, {
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.data.access_token) {
                this.accessToken = response.data.access_token;
                this.refreshToken = response.data.refresh_token;

                await this.updateEnvFile({
                    AMO_ACCESS_TOKEN: this.accessToken,
                    AMO_REFRESH_TOKEN: this.refreshToken
                });

                console.log('✅ Токены обновлены');
                return { success: true };
            }

        } catch (error) {
            console.error('❌ Ошибка обновления токенов:', error.response?.data || error.message);
            return { success: false, error: error.message };
        }
    }

    // Поиск контакта по телефону
    async findContactByPhone(phone) {
        try {
            const formattedPhone = phone.replace(/[^\d]/g, '');

            const response = await this.client.get(`${this.baseURL}/contacts`, {
                params: {
                    query: formattedPhone,
                    limit: 1
                }
            });

            if (response.data._embedded?.contacts?.length > 0) {
                return response.data._embedded.contacts[0];
            }

            return null;
        } catch (error) {
            console.error('❌ Ошибка поиска контакта:', error.response?.data || error.message);
            return null;
        }
    }

    // Создание контакта
    async createContact(phone, name = null) {
        try {
            const formattedPhone = phone.replace(/[^\d]/g, '');
            const contactName = name || `WhatsApp +${formattedPhone}`;

            console.log(`👤 Создание контакта: ${contactName} (${phone})`);

            const contactData = {
                name: contactName,
                custom_fields_values: [
                    {
                        field_code: 'PHONE',
                        values: [
                            {
                                value: formattedPhone,
                                enum_code: 'WORK'
                            }
                        ]
                    }
                ],
                tags: [
                    {
                        name: 'WhatsApp'
                    }
                ]
            };

            const response = await this.client.post(`${this.baseURL}/contacts`, [contactData]);

            if (response.data._embedded?.contacts?.length > 0) {
                const contact = response.data._embedded.contacts[0];
                console.log(`✅ Контакт создан: ID ${contact.id}`);
                return contact;
            }

            throw new Error('Контакт не создался');

        } catch (error) {
            console.error('❌ Ошибка создания контакта:', error.response?.data || error.message);
            throw error;
        }
    }

    // Поиск или создание сделки для контакта
    async findOrCreateLead(contactId, phone) {
        try {
            // Ищем открытые сделки контакта
            const response = await this.client.get(`${this.baseURL}/leads`, {
                params: {
                    'filter[contacts][0]': contactId,
                    'filter[statuses][0][pipeline_id]': process.env.AMO_PIPELINE_ID || 0,
                    limit: 1
                }
            });

            if (response.data._embedded?.leads?.length > 0) {
                return response.data._embedded.leads[0];
            }

            // Создаем новую сделку
            console.log(`📊 Создание сделки для контакта ${contactId}`);

            const leadData = {
                name: `WhatsApp диалог +${phone.replace(/[^\d]/g, '')}`,
                price: 0,
                contacts: {
                    id: contactId
                },
                tags: [
                    {
                        name: 'WhatsApp'
                    }
                ]
            };

            if (process.env.AMO_PIPELINE_ID) {
                leadData.pipeline_id = parseInt(process.env.AMO_PIPELINE_ID);
            }

            if (process.env.AMO_STATUS_ID) {
                leadData.status_id = parseInt(process.env.AMO_STATUS_ID);
            }

            const leadResponse = await this.client.post(`${this.baseURL}/leads`, [leadData]);

            if (leadResponse.data._embedded?.leads?.length > 0) {
                const lead = leadResponse.data._embedded.leads[0];
                console.log(`✅ Сделка создана: ID ${lead.id}`);
                return lead;
            }

            throw new Error('Сделка не создалась');

        } catch (error) {
            console.error('❌ Ошибка работы со сделкой:', error.response?.data || error.message);
            throw error;
        }
    }

    // Добавление примечания
    async addNote(contactId, leadId, text, noteType = 4) {
        try {
            const noteData = {
                note_type: noteType, // 4 = обычное примечание
                params: {
                    text: text
                }
            };

            if (leadId) {
                noteData.entity_id = leadId;
                noteData.entity_type = 'leads';
            } else if (contactId) {
                noteData.entity_id = contactId;
                noteData.entity_type = 'contacts';
            } else {
                throw new Error('Необходим либо contactId, либо leadId');
            }

            const response = await this.client.post(`${this.baseURL}/notes`, [noteData]);

            if (response.data._embedded?.notes?.length > 0) {
                console.log(`📝 Примечание добавлено: "${text.substring(0, 50)}..."`);
                return response.data._embedded.notes[0];
            }

            throw new Error('Примечание не создалось');

        } catch (error) {
            console.error('❌ Ошибка добавления примечания:', error.response?.data || error.message);
            throw error;
        }
    }

    // Обработка входящего сообщения
    async processIncomingMessage(phone, message) {
        try {
            console.log(`📥 Обработка входящего сообщения от ${phone}: ${message.substring(0, 100)}...`);

            // Ищем контакт
            let contact = await this.findContactByPhone(phone);

            // Создаем контакт, если не найден
            if (!contact) {
                contact = await this.createContact(phone);
            }

            // Ищем или создаем сделку
            const lead = await this.findOrCreateLead(contact.id, phone);

            // Добавляем сообщение как примечание
            const noteText = `📥 WhatsApp: ${message}\n\nВремя: ${new Date().toLocaleString('ru')}`;
            await this.addNote(contact.id, lead.id, noteText);

            console.log(`✅ Входящее сообщение обработано для контакта ${contact.id}`);

            return {
                success: true,
                contact,
                lead,
                message: 'Сообщение добавлено в amoCRM'
            };

        } catch (error) {
            console.error('❌ Ошибка обработки входящего сообщения:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Добавление сообщения к контакту
    async addMessageToContact(phone, message, direction = 'outgoing') {
        try {
            let contact = await this.findContactByPhone(phone);

            if (!contact) {
                contact = await this.createContact(phone);
            }

            const lead = await this.findOrCreateLead(contact.id, phone);

            const icon = direction === 'outgoing' ? '📤' : '📥';
            const noteText = `${icon} WhatsApp: ${message}\n\nВремя: ${new Date().toLocaleString('ru')}`;

            await this.addNote(contact.id, lead.id, noteText);

            return { success: true, contact, lead };

        } catch (error) {
            console.error('❌ Ошибка добавления сообщения:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Обновление .env файла
    async updateEnvFile(newVars) {
        try {
            const envPath = path.join(process.cwd(), '.env');
            let envContent = '';

            if (fs.existsSync(envPath)) {
                envContent = fs.readFileSync(envPath, 'utf8');
            }

            Object.keys(newVars).forEach(key => {
                const value = newVars[key];
                const pattern = new RegExp(`^${key}=.*`, 'm');

                if (pattern.test(envContent)) {
                    envContent = envContent.replace(pattern, `${key}=${value}`);
                } else {
                    envContent += `\n${key}=${value}`;
                }
            });

            fs.writeFileSync(envPath, envContent.trim() + '\n');

            // Обновляем process.env
            Object.keys(newVars).forEach(key => {
                process.env[key] = newVars[key];
            });

        } catch (error) {
            console.error('❌ Ошибка обновления .env:', error.message);
        }
    }

    // Получение информации об аккаунте
    async getAccountInfo() {
        try {
            const response = await this.client.get(`${this.baseURL}/account`);
            return response.data;
        } catch (error) {
            console.error('❌ Ошибка получения информации об аккаунте:', error.response?.data || error.message);
            return null;
        }
    }

    // Проверка подключения
    async testConnection() {
        try {
            if (!this.accessToken) {
                return { success: false, error: 'Токен доступа не настроен' };
            }

            const account = await this.getAccountInfo();

            if (account) {
                return { 
                    success: true, 
                    account: account.name,
                    subdomain: this.subdomain
                };
            } else {
                return { success: false, error: 'Не удалось получить данные аккаунта' };
            }
        } catch (error) {
            return { 
                success: false, 
                error: error.message 
            };
        }
    }
}

module.exports = new AmoService();
