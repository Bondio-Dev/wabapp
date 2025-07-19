require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const NodeCache = require('node-cache');

// Импортируем модули
const GupshupService = require('./src/gupshup');
const AmoService = require('./src/amo');

const app = express();
const PORT = process.env.PORT || 3001;

// Кэш для хранения диалогов (время жизни 24 часа)
const dialogCache = new NodeCache({ stdTTL: 86400 });

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Статические файлы для веб-интерфейса
app.use('/public', express.static('public'));
app.use(express.static('public'));

// Логирование запросов
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        env: process.env.NODE_ENV || 'development'
    });
});

// Главная страница
app.get('/', (req, res) => {
    // Если запрос из браузера, показываем веб-интерфейс
    const userAgent = req.get('User-Agent') || '';
    if (userAgent.includes('Mozilla') || userAgent.includes('Chrome')) {
        res.sendFile(__dirname + '/public/index.html');
    } else {
        // API ответ для curl и других инструментов
        res.json({
            message: 'WhatsApp ↔ Gupshup ↔ amoCRM MVP',
            version: '1.0.0',
            webInterface: 'http://' + req.get('host') + '/',
            endpoints: {
                health: '/health',
                'send-message': 'POST /api/send-message',
                'gupshup-webhook': 'POST /webhook/gupshup',
                'amo-auth': 'GET /api/amo/auth',
                'amo-callback': 'GET /api/amo/callback',
                'amo-send': 'POST /api/amo/send-from-crm'
            }
        });
    }
});

// Отправка сообщения через Gupshup
app.post('/api/send-message', async (req, res) => {
    try {
        const { phone, message } = req.body;

        if (!phone || !message) {
            return res.status(400).json({ 
                error: 'Необходимы параметры phone и message' 
            });
        }

        // Отправляем сообщение через Gupshup
        const result = await GupshupService.sendMessage(phone, message);

        if (result.success) {
            // Сохраняем в кэше
            const dialogKey = `dialog_${phone.replace(/[^\d]/g, '')}`;
            const dialog = dialogCache.get(dialogKey) || [];
            dialog.push({
                type: 'outgoing',
                message: message,
                timestamp: new Date().toISOString(),
                messageId: result.messageId
            });
            dialogCache.set(dialogKey, dialog);

            // Обновляем amoCRM
            if (process.env.AMO_ACCESS_TOKEN) {
                await AmoService.addMessageToContact(phone, `📤 WhatsApp: ${message}`, 'outgoing');
            }
        }

        res.json(result);
    } catch (error) {
        console.error('Ошибка отправки сообщения:', error);
        res.status(500).json({ 
            error: 'Внутренняя ошибка сервера',
            message: error.message 
        });
    }
});

// Webhook от Gupshup - получение входящих сообщений
app.post('/webhook/gupshup', async (req, res) => {
    try {
        console.log('Получен webhook от Gupshup:', JSON.stringify(req.body, null, 2));

        const { type, payload } = req.body;

        if (type === 'message' && payload) {
            const { source, payload: messagePayload } = payload;
            const phone = source;
            const message = messagePayload?.text || '';

            if (phone && message) {
                // Сохраняем в кэше
                const dialogKey = `dialog_${phone.replace(/[^\d]/g, '')}`;
                const dialog = dialogCache.get(dialogKey) || [];
                dialog.push({
                    type: 'incoming',
                    message: message,
                    timestamp: new Date().toISOString()
                });
                dialogCache.set(dialogKey, dialog);

                // Обрабатываем в amoCRM
                if (process.env.AMO_ACCESS_TOKEN) {
                    await AmoService.processIncomingMessage(phone, message);
                }

                console.log(`Входящее сообщение от ${phone}: ${message}`);
            }
        }

        res.status(200).json({ status: 'OK' });
    } catch (error) {
        console.error('Ошибка обработки webhook Gupshup:', error);
        res.status(200).json({ status: 'Error', message: error.message });
    }
});

// amoCRM OAuth авторизация
app.get('/api/amo/auth', (req, res) => {
    try {
        const authUrl = AmoService.getAuthUrl();

        if (process.env.NODE_ENV === 'development') {
            // В режиме разработки показываем ссылку
            res.send(`
                <h2>Авторизация amoCRM</h2>
                <p>Перейдите по ссылке для авторизации:</p>
                <a href="${authUrl}" target="_blank">${authUrl}</a>
                <br><br>
                <p>После авторизации вы будете перенаправлены обратно с токенами.</p>
            `);
        } else {
            // В продакшене - редирект
            res.redirect(authUrl);
        }
    } catch (error) {
        console.error('Ошибка генерации URL авторизации:', error);
        res.status(500).json({ error: error.message });
    }
});

// amoCRM OAuth callback
app.get('/api/amo/callback', async (req, res) => {
    try {
        const { code, state } = req.query;

        if (!code) {
            return res.status(400).json({ error: 'Отсутствует код авторизации' });
        }

        const tokens = await AmoService.exchangeCodeForTokens(code);

        if (tokens.success) {
            res.send(`
                <h2>✅ Авторизация amoCRM успешна!</h2>
                <p>Токены получены и сохранены в переменных окружения.</p>
                <p>Теперь можно использовать интеграцию WhatsApp ↔ amoCRM.</p>
                <br>
                <a href="/">← Вернуться на главную</a>
            `);
        } else {
            res.status(400).send(`
                <h2>❌ Ошибка авторизации</h2>
                <p>${tokens.error}</p>
                <a href="/api/amo/auth">Попробовать снова</a>
            `);
        }
    } catch (error) {
        console.error('Ошибка callback авторизации:', error);
        res.status(500).json({ error: error.message });
    }
});

// Отправка из amoCRM
app.post('/api/amo/send-from-crm', async (req, res) => {
    try {
        const { phone, message, contactId, leadId } = req.body;

        if (!phone || !message) {
            return res.status(400).json({ error: 'Необходимы phone и message' });
        }

        // Отправляем через Gupshup
        const result = await GupshupService.sendMessage(phone, message);

        if (result.success) {
            // Добавляем в кэш
            const dialogKey = `dialog_${phone.replace(/[^\d]/g, '')}`;
            const dialog = dialogCache.get(dialogKey) || [];
            dialog.push({
                type: 'outgoing',
                message: message,
                timestamp: new Date().toISOString(),
                source: 'amocrm'
            });
            dialogCache.set(dialogKey, dialog);

            // Обновляем примечание в amoCRM
            if (contactId || leadId) {
                await AmoService.addNote(contactId, leadId, `✅ WhatsApp отправлено: ${message}`);
            }
        }

        res.json(result);
    } catch (error) {
        console.error('Ошибка отправки из amoCRM:', error);
        res.status(500).json({ error: error.message });
    }
});

// Получение истории диалога
app.get('/api/dialog/:phone', (req, res) => {
    try {
        const phone = req.params.phone.replace(/[^\d]/g, '');
        const dialogKey = `dialog_${phone}`;
        const dialog = dialogCache.get(dialogKey) || [];

        res.json({
            phone: req.params.phone,
            messages: dialog,
            total: dialog.length
        });
    } catch (error) {
        console.error('Ошибка получения диалога:', error);
        res.status(500).json({ error: error.message });
    }
});

// Список всех диалогов
app.get('/api/dialogs', (req, res) => {
    try {
        const keys = dialogCache.keys();
        const dialogs = [];

        keys.forEach(key => {
            if (key.startsWith('dialog_')) {
                const phone = key.replace('dialog_', '');
                const messages = dialogCache.get(key) || [];
                const lastMessage = messages[messages.length - 1];

                dialogs.push({
                    phone: `+${phone}`,
                    messageCount: messages.length,
                    lastMessage: lastMessage ? {
                        text: lastMessage.message,
                        timestamp: lastMessage.timestamp,
                        type: lastMessage.type
                    } : null
                });
            }
        });

        res.json(dialogs);
    } catch (error) {
        console.error('Ошибка получения списка диалогов:', error);
        res.status(500).json({ error: error.message });
    }
});

// Обработка 404
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Endpoint не найден',
        path: req.path,
        method: req.method
    });
});

// Глобальная обработка ошибок
app.use((err, req, res, next) => {
    console.error('Необработанная ошибка:', err);
    res.status(500).json({ 
        error: 'Внутренняя ошибка сервера',
        message: err.message
    });
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📍 Адрес: http://localhost:${PORT}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    console.log(`🔐 Авторизация amoCRM: http://localhost:${PORT}/api/amo/auth`);
    console.log(`📞 Webhook Gupshup: http://localhost:${PORT}/webhook/gupshup`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Получен сигнал SIGINT, завершение работы...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Получен сигнал SIGTERM, завершение работы...');
    process.exit(0);
});
