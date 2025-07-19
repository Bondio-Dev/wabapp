# WhatsApp Business API клиент с AMO CRM интеграцией

Полнофункциональное решение для работы с WhatsApp Business API через Gupshup с интеграцией AMO CRM, готовое к развертыванию через Docker.

## 🚀 Особенности

- **Современный веб-интерфейс** с адаптацией под мобильные устройства
- **Полная интеграция** с Gupshup WhatsApp Business API
- **Синхронизация с AMO CRM** - автоматическое создание контактов и сделок
- **Виджет для AMO CRM** - встраивается прямо в карточку сделки
- **Real-time сообщения** через WebSocket
- **PWA поддержка** для мобильных устройств
- **Docker контейнеризация** для легкого развертывания
- **Мониторинг через Netdata**

## 📋 Требования

- Docker и Docker Compose
- Gupshup WhatsApp Business API аккаунт
- AMO CRM интеграция (Client ID, Secret, токены)
- HTTPS домен для webhook'ов

## 🛠 Быстрый старт

### 1. Клонирование репозитория

```bash
git clone <repository-url>
cd whatsapp-amocrm-client
```

### 2. Настройка конфигурации

Скопируйте файл примера и заполните своими данными:

```bash
cp config/.env.example .env
nano .env
```

### 3. Запуск через Docker Compose

```bash
# Сборка и запуск всех сервисов
docker-compose up -d

# Проверка статуса
docker-compose ps

# Просмотр логов
docker-compose logs -f
```

### 4. Доступ к сервисам

- **Веб-клиент**: http://localhost:3000
- **API Backend**: http://localhost:3001
- **Мониторинг Netdata**: http://localhost:19999

## ⚙️ Конфигурация

### Gupshup WhatsApp Business API

1. Зарегистрируйтесь на [Gupshup](https://www.gupshup.io/)
2. Создайте WhatsApp Business приложение
3. Получите API Key и App Name
4. Настройте webhook URL: `https://yourdomain.com/webhook/gupshup`

### AMO CRM

1. Перейдите в Настройки → Интеграции → Создать интеграцию
2. Укажите Redirect URI: `https://yourdomain.com/auth/amo/callback`
3. Получите Client ID и Client Secret
4. Выполните OAuth авторизацию для получения токенов

### Основные переменные окружения

```bash
# Gupshup
GUPSHUP_APP_NAME=your_app_name
GUPSHUP_API_KEY=your_api_key
GUPSHUP_SOURCE_NUMBER=917834811114

# AMO CRM
AMO_SUBDOMAIN=your_subdomain
AMO_CLIENT_ID=your_client_id
AMO_CLIENT_SECRET=your_client_secret
AMO_ACCESS_TOKEN=your_access_token
AMO_REFRESH_TOKEN=your_refresh_token
AMO_PIPELINE_ID=your_pipeline_id

# База данных
DATABASE_URL=postgres://whatsapp_user:whatsapp_pass@postgres:5432/whatsapp_client

# Приложение
BASE_URL=https://yourdomain.com
JWT_SECRET=your-super-secret-jwt-key
```

## 🏗 Архитектура

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │◄───│   Nginx Proxy    │◄───│   Users         │
│   (React)       │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐    ┌──────────────────┐
│   Backend API   │◄───│   WebSocket      │
│   (Node.js)     │    │   (Socket.IO)    │
└─────────────────┘    └──────────────────┘
         │                        │
    ┌────▼────┐              ┌────▼────┐
    │ PostgreSQL │          │  Redis  │
    │ Database   │          │  Cache  │
    └────────────┘          └─────────┘
         │
    ┌────▼────┐
    │ External│
    │   APIs  │
    │ (Gupshup│
    │ AMO CRM)│
    └─────────┘
```

## 📱 Мобильная адаптация

Приложение полностью адаптировано для мобильных устройств:

- **Responsive дизайн** с breakpoints
- **Touch-friendly интерфейс**
- **PWA функциональность** (можно установить как приложение)
- **Адаптивная навигация** (список чатов ↔ окно сообщений)

### Встраивание в мобильное приложение

Используйте WebView для интеграции в мобильные приложения:

**React Native:**
```javascript
import { WebView } from 'react-native-webview';

<WebView 
  source={{ uri: 'https://yourdomain.com' }}
  style={{ flex: 1 }}
/>
```

**Cordova/PhoneGap:**
```xml
<content src="https://yourdomain.com" />
```

## 🔧 AMO CRM виджет

Приложение автоматически определяет режим виджета и адаптируется:

1. **Автоматическое определение** - проверяет загрузку внутри iframe
2. **Компактный интерфейс** - оптимизирован для встраивания
3. **Контекстная загрузка** - показывает чат для текущего контакта/сделки

### Настройка виджета в AMO CRM

```javascript
// В настройках виджета AMO CRM
{
  "widget": {
    "name": "WhatsApp Chat",
    "short_description": "Чат с клиентом через WhatsApp",
    "description": "Интегрированный WhatsApp клиент для общения с контактами",
    "version": "1.0.0",
    "interface_version": 2,
    "init_once": false,
    "locale": ["ru"],
    "installation": true,
    "settings": {
      "widget_url": "https://yourdomain.com/widget"
    }
  }
}
```

## 📊 Мониторинг

Netdata автоматически отслеживает:

- **Системные ресурсы**: CPU, RAM, диск, сеть
- **Docker контейнеры**: статус и производительность
- **Приложения**: Node.js, PostgreSQL, Redis
- **Пользовательские метрики**: количество сообщений, ошибки API

Доступ к дашборду: http://localhost:19999

## 🔒 Безопасность

- **JWT аутентификация** для API
- **Rate limiting** для защиты от злоупотреблений  
- **CORS настройки** для безопасного взаимодействия
- **Helmet.js** для защиты Express приложения
- **Input validation** и sanitization
- **HTTPS only** в production

## 🚀 Production развертывание

### Nginx конфигурация

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }

    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### SSL сертификаты

```bash
# Получение сертификата через Let's Encrypt
sudo certbot --nginx -d yourdomain.com
```

## 📝 API документация

### Отправка сообщения

```bash
curl -X POST http://localhost:3001/api/messages/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "phoneNumber": "+79001234567",
    "message": "Привет! Это тестовое сообщение",
    "chatId": "chat_79001234567"
  }'
```

### Получение чатов

```bash
curl -X GET http://localhost:3001/api/contacts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🤝 Поддержка

Для получения помощи:

1. Проверьте логи: `docker-compose logs -f backend`
2. Проверьте статус здоровья: http://localhost:3001/health
3. Просмотрите мониторинг: http://localhost:19999

## 📄 Лицензия

MIT License - см. файл LICENSE для деталей.

## 🎯 Roadmap

- [ ] Поддержка отправки файлов
- [ ] Групповые чаты
- [ ] Автоответчик
- [ ] Интеграция с другими CRM
- [ ] Аналитика и отчеты
- [ ] Чат-боты
- [ ] Мультиязычность
- [ ] Mobile приложения (iOS/Android)
