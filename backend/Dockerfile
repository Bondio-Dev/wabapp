FROM node:18-alpine

WORKDIR /app

# Копируем package.json
COPY package.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем исходный код
COPY . .

# Создаем директории
RUN mkdir -p uploads logs

EXPOSE 3001

CMD ["npm", "start"]
