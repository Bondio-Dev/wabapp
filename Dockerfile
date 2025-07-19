# 1. Базовый образ
FROM node:18-alpine

# 2. Рабочая директория в контейнере
WORKDIR /app

# 3. Копируем package.json и package-lock.json (если есть)
COPY package*.json ./

# 4. Устанавливаем зависимости
RUN npm install --omit=dev

# 5. Копируем весь исходный код
COPY . .

# 6. Экспонируем порт приложения
EXPOSE 3001

# 7. Определяем команду запуска
CMD ["node", "server.js"]
