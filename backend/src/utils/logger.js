const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Console для development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),

    // Файл для всех логов
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/app.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),

    // Отдельный файл для ошибок
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 3
    })
  ]
});

module.exports = logger;
