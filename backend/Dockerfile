# Используем официальный Node.js образ
FROM node:18-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Устанавливаем системные зависимости
RUN apk add --no-cache     curl     tzdata     && ln -sf /usr/share/zoneinfo/Europe/Moscow /etc/localtime

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production && npm cache clean --force

# Копируем исходный код
COPY . .

# Создаем директории для логов и загрузок
RUN mkdir -p /app/logs /app/uploads &&     chown -R node:node /app

# Переключаемся на пользователя node для безопасности
USER node

# Открываем порт
EXPOSE 3001

# Команда для проверки здоровья
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3   CMD curl -f http://localhost:3001/health || exit 1

# Запускаем приложение
CMD ["node", "src/app.js"]
