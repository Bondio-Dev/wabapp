const express = require('express');
const router = express.Router();
const amo = require('../integrations/amo');
const logger = require('../utils/logger');

// Получить URL для авторизации AMO CRM
router.get('/auth', (req, res) => {
  const authUrl = `https://${process.env.AMO_SUBDOMAIN}.amocrm.ru/oauth2/authorize?` +
    `client_id=${process.env.AMO_CLIENT_ID}&` +
    `response_type=code&` +
    `redirect_uri=${process.env.BASE_URL}/api/amo/callback`;

  res.json({
    success: true,
    authUrl: authUrl
  });
});

// Callback для получения токенов
router.get('/callback', async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Код авторизации отсутствует'
      });
    }

    // Получаем токены
    const axios = require('axios');
    const response = await axios.post(`https://${process.env.AMO_SUBDOMAIN}.amocrm.ru/oauth2/access_token`, {
      client_id: process.env.AMO_CLIENT_ID,
      client_secret: process.env.AMO_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: `${process.env.BASE_URL}/api/amo/callback`
    });

    const { access_token, refresh_token } = response.data;

    // Сохраняем токены
    amo.accessToken = access_token;
    amo.refreshToken = refresh_token;

    // Кэшируем в Redis
    const redis = require('../db/redis');
    await redis.setAmoToken(access_token, 86400); // 1 день

    logger.info('AMO CRM авторизация успешна');

    res.json({
      success: true,
      message: 'AMO CRM успешно подключен!'
    });
  } catch (error) {
    logger.error('Ошибка AMO CRM callback:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка авторизации AMO CRM'
    });
  }
});

// Тест подключения AMO CRM
router.get('/test', async (req, res) => {
  try {
    const result = await amo.makeRequest('GET', '/account');
    res.json({
      success: true,
      account: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Ошибка подключения к AMO CRM'
    });
  }
});

module.exports = router;
