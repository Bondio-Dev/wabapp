# WhatsApp ↔ Gupshup ↔ amoCRM MVP

Минимальный проект для интеграции WhatsApp через Gupshup API с amoCRM. Позволяет:

- ✅ Отправлять сообщения в WhatsApp через Gupshup API
- ✅ Получать входящие сообщения через webhook
- ✅ Автоматически создавать контакты и сделки в amoCRM
- ✅ Добавлять все сообщения как примечания в amoCRM
- ✅ Отправлять сообщения из amoCRM в WhatsApp

## 🚀 Быстрый запуск

### 1. Установка

```bash
# Клонируйте или скопируйте проект
cd whatsapp-amo-mvp

# Установите зависимости
npm install

# Настройте .env файл (см. ниже)
cp .env.example .env
nano .env
```

### 2. Настройка .env

Заполните следующие параметры в файле `.env`:

```env
# Основные настройки
NODE_ENV=production
PORT=3001

# Gupshup WhatsApp API
GUPSHUP_API_KEY=ваш_api_key_из_gupshup
GUPSHUP_APP_NAME=имя_приложения_gupshup
GUPSHUP_SOURCE_NUMBER=ваш_whatsapp_номер

# amoCRM API
AMO_SUBDOMAIN=ваш_поддомен_amocrm
AMO_CLIENT_ID=client_id_интеграции
AMO_CLIENT_SECRET=client_secret_интеграции
AMO_REDIRECT_URI=http://www.bondio.ru/api/amo/callback
```

### 3. Запуск

```bash
# Обычный запуск
npm start

# Для разработки с автоперезапуском
npm run dev

# Запуск через PM2 (рекомендуется для продакшена)
npm run pm2
```

## 🔧 Настройка внешних сервисов

### Настройка Gupshup

1. Зарегистрируйтесь на [gupshup.io](https://www.gupshup.io)
2. Создайте WhatsApp Business приложение
3. В настройках webhook укажите: `http://www.bondio.ru/webhook/gupshup`
4. Скопируйте API Key и имя приложения в `.env`

### Настройка amoCRM

1. В amoCRM перейдите в Настройки → Интеграции
2. Создайте собственную интеграцию
3. Получите Client ID и Client Secret
4. Укажите Redirect URI: `http://www.bondio.ru/api/amo/callback`
5. Заполните данные в `.env`
6. Авторизуйтесь: откройте `http://www.bondio.ru/api/amo/auth`

## 📡 API Endpoints

### Основные

- `GET /health` - Проверка работоспособности
- `GET /` - Информация о проекте и endpoints

### Сообщения

- `POST /api/send-message` - Отправка сообщения
  ```json
  {
    "phone": "+79001234567",
    "message": "Привет!"
  }
  ```

- `GET /api/dialog/:phone` - История сообщений с номером
- `GET /api/dialogs` - Список всех диалогов

### amoCRM

- `GET /api/amo/auth` - Начать авторизацию OAuth
- `GET /api/amo/callback` - Callback для получения токенов
- `POST /api/amo/send-from-crm` - Отправка из amoCRM
  ```json
  {
    "phone": "+79001234567",
    "message": "Сообщение из amoCRM",
    "contactId": 12345,
    "leadId": 67890
  }
  ```

### Webhook

- `POST /webhook/gupshup` - Webhook для входящих сообщений от Gupshup

## 🔄 Как это работает

### Входящие сообщения
1. Клиент пишет в WhatsApp
2. Gupshup отправляет webhook на `/webhook/gupshup`
3. Сервер обрабатывает сообщение
4. Создается/обновляется контакт в amoCRM
5. Создается сделка (если нет)
6. Добавляется примечание с текстом сообщения

### Исходящие сообщения
1. Отправка через API `/api/send-message`
2. Или из amoCRM через `/api/amo/send-from-crm`
3. Сообщение отправляется через Gupshup API
4. Добавляется в историю диалога
5. Добавляется примечание в amoCRM

## 🐛 Отладка

### Проверка работы

```bash
# Проверка здоровья
curl http://www.bondio.ru/health

# Отправка тестового сообщения
curl -X POST http://www.bondio.ru/api/send-message \
  -H "Content-Type: application/json" \
  -d '{"phone":"+79001234567","message":"Тестовое сообщение"}'

# Проверка диалогов
curl http://www.bondio.ru/api/dialogs
```

### Логи

Все важные события логируются в консоль:
- ✅ Успешные операции
- ❌ Ошибки с деталями
- 📤📥 Входящие и исходящие сообщения
- 🔄 Обновление токенов

### Распространенные проблемы

**1. "Gupshup API не настроен"**
- Проверьте `GUPSHUP_API_KEY` и `GUPSHUP_APP_NAME` в `.env`

**2. "Токен доступа не настроен"**
- Пройдите авторизацию через `/api/amo/auth`

**3. "Webhook не получается"**
- Убедитесь что сервер доступен извне
- Проверьте URL webhook в настройках Gupshup

**4. Сообщения не доходят**
- Проверьте статус WhatsApp номера
- Убедитесь что получатель opt-in (согласился на получение)

## 📁 Структура проекта

```
whatsapp-amo-mvp/
├── server.js           # Главный файл сервера
├── src/
│   ├── gupshup.js     # API Gupshup WhatsApp
│   └── amo.js         # API amoCRM
├── package.json        # Зависимости Node.js
├── .env               # Настройки (не коммитить!)
└── README.md          # Эта документация
```

## 🔒 Безопасность

⚠️ **Важно для продакшена:**

- Используйте HTTPS
- Настройте firewall
- Ограничьте доступ к API
- Регулярно обновляйте зависимости
- Не коммитьте .env в git

## 📈 Развитие

Следующие возможности для развития проекта:

- [ ] База данных для хранения истории
- [ ] Очередь сообщений
- [ ] Поддержка медиа файлов
- [ ] Шаблоны сообщений
- [ ] Веб-интерфейс
- [ ] Аналитика
- [ ] Множественные операторы
- [ ] Chatbot функции

## 📄 Лицензия

MIT License - используйте как хотите!

## 🆘 Поддержка

При проблемах:

1. Проверьте логи в консоли
2. Убедитесь что все настройки в `.env` корректные
3. Проверьте доступность webhook URL
4. Посмотрите статус в `/health`

---

**Готово к использованию!** 🎉

Просто запустите `npm start` и начинайте общаться через WhatsApp ↔ amoCRM
