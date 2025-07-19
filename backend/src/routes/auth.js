const express = require('express');
const router = express.Router();

// Простая заглушка для аутентификации
router.post('/login', (req, res) => {
  res.json({
    success: true,
    token: 'simple_token_for_mvp',
    message: 'Аутентификация в разработке'
  });
});

router.get('/me', (req, res) => {
  res.json({
    success: true,
    user: {
      id: 1,
      name: 'MVP User',
      email: 'user@example.com'
    }
  });
});

module.exports = router;
