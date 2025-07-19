# WhatsApp Business API - MVP версия

Простое веб-приложение для управления WhatsApp сообщениями с интеграцией AMO CRM через Gupshup API.

## 🚀 Быстрый запуск

### Автоматический запуск
```bash
chmod +x quick-start.sh
./quick-start.sh
```

### Ручной запуск

1. **Клонируйте проект:**
```bash
git clone <repository-url>
cd wabapp_fixed
```

2. **Настройте переменные окружения:**
```bash
cp .env .env
nano .env  # Отредактируйте настройки
```

3. **Запустите проект:**
```bash
# Для localhost
docker-compose up --build -d

# Проверьте статус
docker-compose ps
```

## 🌐 Доступ к приложению

### Localhost (разработка):
- **Веб-интерфейс:** http://localhost:3000
- **API Backend:** http://localhost:3001
- **Health Check:** http://localhost:3001/health

### Реальный сервер (83.166.238.230):
- **Веб-интерфейс:** http://83.166.238.230:3000
- **API Backend:** http://83.166.238.230:3001
- **Health Check:** http://83.166.238.230:3001/health

## ⚙️ Настройка интеграций

### 1. AMO CRM
1. Перейдите: `http://localhost:3001/api/amo/auth` (или с реальным IP)
2. Скопируйте URL авторизации
3. Пройдите OAuth авторизацию в AMO CRM
4. После успешной авторизации токены сохранятся автоматически

### 2. Gupshup WhatsApp API
1. Зарегистрируйтесь на https://gupshup.io
2. Создайте WhatsApp Business приложение  
3. Получите API ключ и название приложения
4. Укажите их в `.env` файле

## 📋 Основные возможности

- ✅ Отправка и получение WhatsApp сообщений
- ✅ Управление контактами
- ✅ Интеграция с AMO CRM (создание контактов и сделок)
- ✅ Веб-интерфейс с real-time обновлениями
- ✅ WebSocket для мгновенных уведомлений
- ✅ Docker контейнеризация

## 🗂️ Структура проекта

```
wabapp_fixed/
├── backend/              # Node.js API сервер
│   ├── src/             # Исходный код
│   └── Dockerfile       # Docker конфигурация
├── frontend/            # React веб-приложение
│   ├── src/             # Исходный код React
│   └── Dockerfile       # Docker конфигурация
├── docker-compose.yml   # Оркестрация контейнеров
├── .env                 # Переменные окружения
└── quick-start.sh       # Скрипт быстрого запуска
```

## 🔧 Управление

### Основные команды:
```bash
# Запуск
docker-compose up -d

# Остановка
docker-compose down

# Перезапуск
docker-compose restart

# Логи всех сервисов
docker-compose logs -f

# Логи конкретного сервиса
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Проверка работы:
```bash
# Статус контейнеров
docker-compose ps

# Health check
curl http://localhost:3001/health

# Тест API
curl http://localhost:3001/api/contacts
```

## 🐛 Решение проблем

### Контейнеры не запускаются:
```bash
# Проверьте логи
docker-compose logs

# Пересоберите образы
docker-compose build --no-cache
docker-compose up -d
```

### Backend не отвечает:
```bash
# Проверьте переменные окружения
docker-compose exec backend printenv

# Проверьте подключение к БД
docker-compose logs postgres
```

### Проблемы с WebSocket:
```bash
# Проверьте CORS настройки в .env
# Убедитесь что WebSocket URL корректный
```

## 📝 API Endpoints

### Сообщения:
- `GET /api/messages` - Получить все сообщения
- `POST /api/messages/send` - Отправить сообщение
- `GET /api/messages/contact/:id` - Сообщения контакта

### Контакты:
- `GET /api/contacts` - Получить все контакты  
- `GET /api/contacts/:id` - Получить контакт
- `PUT /api/contacts/:id` - Обновить контакт

### AMO CRM:
- `GET /api/amo/auth` - URL авторизации
- `GET /api/amo/callback` - OAuth callback
- `GET /api/amo/test` - Тест подключения

### Webhooks:
- `POST /webhook/gupshup` - Webhook Gupshup
- `POST /webhook/amo` - Webhook AMO CRM

## 🎯 Планы развития

- [ ] Аутентификация пользователей
- [ ] Групповые рассылки
- [ ] Шаблоны сообщений  
- [ ] Статистика и аналитика
- [ ] Файлы и медиа
- [ ] Автоответчик

## 💡 Поддержка

По вопросам обращайтесь:
- 📧 Email: support@example.com
- 📱 Telegram: @support_bot
- 🌐 Документация: https://docs.example.com

## 📄 Лицензия

MIT License - используйте свободно для коммерческих и некоммерческих целей.
