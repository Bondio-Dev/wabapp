# 🚀 Быстрая установка WhatsApp ↔ amoCRM MVP

## 1️⃣ Подготовка сервера

```bash
# Обновите систему (Ubuntu/Debian)
sudo apt update && sudo apt upgrade -y

# Установите Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Проверьте версию
node --version  # должно быть 16+
npm --version
```

## 2️⃣ Установка проекта

```bash
# Перейдите в директорию
cd /opt

# Распакуйте архив
unzip whatsapp-amo-mvp.zip
cd whatsapp-amo-mvp

# Установите зависимости
npm install

# Скопируйте настройки
cp .env.example .env
```

## 3️⃣ Настройка .env

Отредактируйте файл `.env`:

```bash
nano .env
```

**Обязательно заполните:**
- `GUPSHUP_API_KEY` - API ключ из Gupshup
- `GUPSHUP_APP_NAME` - имя приложения в Gupshup  
- `AMO_SUBDOMAIN` - поддомен вашего amoCRM
- `AMO_CLIENT_ID` - ID интеграции amoCRM
- `AMO_CLIENT_SECRET` - секретный ключ интеграции

## 4️⃣ Запуск

```bash
# Быстрый запуск через скрипт
chmod +x start.sh
./start.sh

# Или обычный запуск
npm start

# Или через PM2 для продакшена
npm install -g pm2
npm run pm2
```

## 5️⃣ Настройка Gupshup

1. Войдите в [Gupshup](https://www.gupshup.io/whatsapp/dashboard)
2. В настройках webhook укажите: `http://83.166.238.230:3001/webhook/gupshup`
3. Сохраните настройки

## 6️⃣ Настройка amoCRM

1. Откройте: `http://83.166.238.230:3001/api/amo/auth`
2. Пройдите авторизацию OAuth
3. Токены сохранятся автоматически

## ✅ Проверка

```bash
# Проверьте здоровье сервиса
curl http://83.166.238.230:3001/health

# Отправьте тестовое сообщение
curl -X POST http://83.166.238.230:3001/api/send-message \
  -H "Content-Type: application/json" \
  -d '{"phone":"+79001234567","message":"Тестовое сообщение"}'
```

## 🛠 Управление

```bash
# PM2 команды
pm2 status                    # статус
pm2 logs whatsapp-amo-mvp    # логи  
pm2 restart whatsapp-amo-mvp # перезапуск
pm2 stop whatsapp-amo-mvp    # остановка
```

**Готово!** 🎉 Теперь WhatsApp интегрирован с amoCRM.
