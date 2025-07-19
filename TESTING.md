# 🧪 ИНСТРУКЦИЯ ПО ТЕСТИРОВАНИЮ MVP

## 🏠 Тестирование на localhost

### 1. Подготовка
```bash
# Распакуйте архив
unzip whatsapp-amo-mvp.zip
cd whatsapp-amo-mvp

# Установите зависимости
npm install

# Настройте .env для localhost
cp .env.example .env
nano .env
```

### 2. Настройки для localhost
В файле `.env` укажите:
```env
NODE_ENV=development
PORT=3001
AMO_REDIRECT_URI=http://localhost:3001/api/amo/callback

# Остальные настройки как для продакшена
GUPSHUP_API_KEY=ваш_ключ
AMO_SUBDOMAIN=ваш_поддомен
# ...
```

### 3. Запуск
```bash
# Разработческий режим с автоперезапуском
npm run dev

# Или обычный запуск
npm start
```

### 4. Тестирование localhost
- **Веб-интерфейс:** http://localhost:3001
- **API Health:** http://localhost:3001/health
- **OAuth amoCRM:** http://localhost:3001/api/amo/auth

---

## 🌐 Тестирование на реальном сервере (83.166.238.230)

### 1. Загрузка на сервер
```bash
# Скопируйте архив на сервер
scp whatsapp-amo-mvp.zip root@83.166.238.230:/opt/

# Подключитесь к серверу
ssh root@83.166.238.230
```

### 2. Установка на сервере
```bash
cd /opt
unzip whatsapp-amo-mvp.zip
cd whatsapp-amo-mvp

# Установите Node.js если не установлен
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установите зависимости
npm install
```

### 3. Настройки для реального сервера
```bash
cp .env.example .env
nano .env
```

Укажите в `.env`:
```env
NODE_ENV=production
PORT=3001
AMO_REDIRECT_URI=http://83.166.238.230:3001/api/amo/callback

GUPSHUP_API_KEY=ваш_ключ_gupshup
GUPSHUP_APP_NAME=имя_приложения
AMO_SUBDOMAIN=ваш_поддомен
AMO_CLIENT_ID=ваш_client_id
AMO_CLIENT_SECRET=ваш_секрет
```

### 4. Запуск в продакшене
```bash
# Через интерактивный скрипт
./start.sh

# Или напрямую через PM2
npm install -g pm2
npm run pm2

# Проверка статуса
pm2 status
pm2 logs
```

### 5. Тестирование реального сервера
- **Веб-интерфейс:** http://83.166.238.230:3001
- **API Health:** http://83.166.238.230:3001/health
- **OAuth amoCRM:** http://83.166.238.230:3001/api/amo/auth

---

## 🔧 Настройка внешних сервисов

### Gupshup Webhook
В панели Gupshup укажите webhook URL:
- **Localhost:** http://localhost:3001/webhook/gupshup *(только для тестов)*
- **Сервер:** http://83.166.238.230:3001/webhook/gupshup

### amoCRM Redirect URI
В настройках интеграции amoCRM:
- **Localhost:** http://localhost:3001/api/amo/callback
- **Сервер:** http://83.166.238.230:3001/api/amo/callback

---

## ✅ Проверочные тесты

### 1. Health Check
```bash
curl http://83.166.238.230:3001/health
# Должен вернуть status: "OK"
```

### 2. Отправка тестового сообщения
```bash
curl -X POST http://83.166.238.230:3001/api/send-message \
  -H "Content-Type: application/json" \
  -d '{"phone":"+79001234567","message":"Тест"}'
```

### 3. Проверка диалогов
```bash
curl http://83.166.238.230:3001/api/dialogs
```

### 4. Веб-интерфейс
Откройте в браузере и проверьте:
- ✅ Статус сервисов (зеленые карточки)
- ✅ Форма отправки работает
- ✅ Список диалогов загружается
- ✅ История сообщений отображается

---

## 🐛 Решение проблем

### "Gupshup API не настроен"
- Проверьте GUPSHUP_API_KEY в .env
- Убедитесь что webhook URL правильный

### "Токен доступа не настроен"
- Пройдите авторизацию через /api/amo/auth
- Проверьте AMO_CLIENT_ID и AMO_CLIENT_SECRET

### Webhook не работает
- Убедитесь что сервер доступен из интернета
- Проверьте firewall (порт 3001 открыт)
- Проверьте логи: `pm2 logs` или в консоли

### Сообщения не доходят
- Проверьте статус WhatsApp номера в Gupshup
- Убедитесь что получатель opt-in

---

## 📊 Мониторинг

### PM2 команды
```bash
pm2 status                    # статус всех процессов
pm2 logs whatsapp-amo-mvp    # логи приложения
pm2 monit                    # интерактивный монитор
pm2 restart whatsapp-amo-mvp # перезапуск
```

### Логи приложения
Все события логируются в консоль:
- ✅ Успешные операции
- ❌ Ошибки с деталями  
- 📤📥 Входящие/исходящие сообщения
- 🔄 Обновление токенов amoCRM

**Готово к тестированию!** 🎉
