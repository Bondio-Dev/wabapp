const express = require('express');
const router = express.Router();
const db = require('../db/database');
const logger = require('../utils/logger');

// Получить все контакты
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT c.*, 
        COUNT(m.id) as message_count,
        MAX(m.created_at) as last_message_at
      FROM contacts c
      LEFT JOIN messages m ON c.id = m.contact_id
      GROUP BY c.id
      ORDER BY last_message_at DESC NULLS LAST
    `);

    res.json({
      success: true,
      contacts: result.rows
    });
  } catch (error) {
    logger.error('Ошибка получения контактов:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения контактов'
    });
  }
});

// Получить контакт по ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM contacts WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Контакт не найден'
      });
    }

    res.json({
      success: true,
      contact: result.rows[0]
    });
  } catch (error) {
    logger.error('Ошибка получения контакта:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения контакта'
    });
  }
});

// Обновить контакт
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const result = await db.query(
      'UPDATE contacts SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [name, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Контакт не найден'
      });
    }

    res.json({
      success: true,
      contact: result.rows[0]
    });
  } catch (error) {
    logger.error('Ошибка обновления контакта:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка обновления контакта'
    });
  }
});

module.exports = router;
