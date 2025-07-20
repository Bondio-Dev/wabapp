require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const NodeCache = require('node-cache');

const GupshupService = require('./src/gupshup');
const AmoService = require('./src/amo');

const app = express();
const PORT = process.env.PORT || 3001;
const dialogCache = new NodeCache({ stdTTL: 86400 });

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Логи
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});

// Health
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});

// Тестовый маршрут
app.get('/api/test-connection', async (req, res) => {
    const results = {};
    // Gupshup
    try {
        const r = await axios.post(
            `${process.env.BASE_URL}/webhook/gupshup`,
            { test: 'ping' },
            { headers:{'Content-Type':'application/json'}, timeout:5000 }
        );
        results.gupshup = { status: r.status, data: r.data };
    } catch (e) {
        results.gupshup = {
            error: true,
            status: e.response?.status,
            message: e.response?.data || e.message
        };
    }
    // amoCRM
    try {
        const authUrl = `${process.env.AMO_AUTH_URL}?client_id=${encodeURIComponent(process.env.AMO_CLIENT_ID)}&redirect_uri=${encodeURIComponent(process.env.AMO_REDIRECT_URI)}&response_type=code&state=test`;
        const r = await axios.get(authUrl, {
            maxRedirects: 0,
            validateStatus: s => s>=200&&s<400,
            timeout:5000
        });
        results.amo = { status: r.status, location: r.headers.location||null };
    } catch (e) {
        results.amo = {
            error: true,
            status: e.response?.status,
            location: e.response?.headers?.location,
            message: e.message
        };
    }
    res.json(results);
});

// Существующие маршруты
app.post('/api/send-message', async (req, res) => {
    try {
        const { phone, message } = req.body;
        if (!phone||!message) return res.status(400).json({ error:'phone и message обязательны' });
        const result = await GupshupService.sendMessage(phone, message);
        if (result.success) {
            const key = `dialog_${phone.replace(/\D/g,'')}`;
            const dlg = dialogCache.get(key)||[];
            dlg.push({ type:'outgoing', message, timestamp:new Date().toISOString(), messageId:result.messageId });
            dialogCache.set(key, dlg);
            if (process.env.AMO_ACCESS_TOKEN) {
                await AmoService.addMessageToContact(phone, `📤 ${message}`, 'outgoing');
            }
        }
        res.json(result);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error:e.message });
    }
});

app.post('/webhook/gupshup', async (req, res) => {
    try {
        const { type, payload } = req.body;
        if (type==='message' && payload) {
            const phone = payload.source;
            const txt = payload.payload?.text||'';
            if (phone && txt) {
                const key = `dialog_${phone.replace(/\D/g,'')}`;
                const dlg = dialogCache.get(key)||[];
                dlg.push({ type:'incoming', message:txt, timestamp:new Date().toISOString() });
                dialogCache.set(key, dlg);
                if (process.env.AMO_ACCESS_TOKEN) {
                    await AmoService.processIncomingMessage(phone, txt);
                }
            }
        }
    } catch(e){ console.error(e); }
    res.json({ status:'OK' });
});

app.get('/api/amo/auth', (req, res) => {
    try {
        const url = AmoService.getAuthUrl();
        process.env.NODE_ENV==='development'
            ? res.send(`<a href="${url}" target="_blank">Авторизоваться</a>`)
            : res.redirect(url);
    } catch(e){ res.status(500).json({ error:e.message }); }
});

app.get('/api/amo/callback', async (req, res) => {
    try {
        const { code } = req.query;
        if (!code) return res.status(400).json({ error:'Отсутствует code' });
        const tok = await AmoService.exchangeCodeForTokens(code);
        tok.success
            ? res.send('<h2>Авторизация успешна</h2><a href="/">← Назад</a>')
            : res.status(400).send(`<h2>Ошибка: ${tok.error}</h2>`);
    } catch(e){ res.status(500).json({ error:e.message }); }
});

app.post('/api/amo/send-from-crm', async (req, res) => {
    try {
        const { phone, message, contactId, leadId } = req.body;
        if (!phone||!message) return res.status(400).json({ error:'phone и message обязательны' });
        const result = await GupshupService.sendMessage(phone, message);
        if (result.success) {
            const key = `dialog_${phone.replace(/\D/g,'')}`;
            const dlg = dialogCache.get(key)||[];
            dlg.push({ type:'outgoing', message, timestamp:new Date().toISOString(), source:'amocrm' });
            dialogCache.set(key, dlg);
            if (contactId||leadId) {
                await AmoService.addNote(contactId, leadId, `✅ WhatsApp: ${message}`);
            }
        }
        res.json(result);
    } catch(e){ res.status(500).json({ error:e.message }); }
});

app.get('/api/dialog/:phone', (req, res) => {
    const p=req.params.phone.replace(/\D/g,'');
    res.json({ phone:req.params.phone, messages:dialogCache.get(`dialog_${p}`)||[] });
});

app.get('/api/dialogs', (req, res) => {
    const dialogs = dialogCache.keys()
        .filter(k=>k.startsWith('dialog_'))
        .map(k=>{
            const p=k.split('dialog_')[1];
            const msgs=dialogCache.get(k)||[];
            return { phone:`+${p}`, messageCount:msgs.length, lastMessage: msgs.slice(-1)[0]||null };
        });
    res.json(dialogs);
});

app.use((req,res)=>res.status(404).json({error:'Not found'}));
app.use((err,req,res)=>res.status(500).json({error:err.message}));

app.listen(PORT,'0.0.0.0',()=>{
    console.log(`🚀 Сервер на порту ${PORT}`);
    console.log(`Health: http://localhost:${PORT}/health`);
});
