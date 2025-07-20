# WhatsApp ↔ AmoCRM Integration MVP

Простая интеграция между Gupshup WhatsApp API и AmoCRM API v4 с веб-интерфейсом для тестирования.

## ✨ Основные возможности

- ✅ **Корректные API интеграции** с Gupshup и AmoCRM API v4
- ✅ **OAuth 2.0 авторизация** с автоматическим обновлением токенов AmoCRM
- ✅ **Веб-интерфейс** с кнопками тестирования подключений
- ✅ **Отправка сообщений** через WhatsApp API
- ✅ **Автоматическое создание** контактов и сделок в AmoCRM
- ✅ **Webhook для входящих** сообщений от Gupshup
- ✅ **Docker контейнеризация** для простого развертывания
- ✅ **Nginx reverse proxy** с SSL поддержкой

## 🚀 Быстрый запуск

1. **Клонировать репозиторий и перейти в папку:**
   ```bash
   cd wabapp-mvp
   ```

2. **Проверить настройки в .env файле** (уже настроен с вашими ключами)

3. **Запустить через Makefile:**
   ```bash
   make
   # Выбрать пункт 2 для сборки и запуска
   ```

4. **Открыть в браузере:**
   ```
   http://bondio.ru (или http://localhost:3001 для локального тестирования)
   ```

## 🔧 Настройка

### Переменные окружения (.env)

Все необходимые переменные уже настроены в `.env` файле:

```env
# Gupshup WhatsApp API
GUPSHUP_API_KEY=sk_0e53c54f994f4e50a279e565aa1572ee
GUPSHUP_APP_NAME=test204
GUPSHUP_SOURCE_NUMBER=79522829086

# amoCRM API credentials
AMO_SUBDOMAIN=bondarik
AMO_CLIENT_ID=d96bc93f-1fb0-452f-890a-70682047c271
AMO_CLIENT_SECRET=BAJmwJrEV8s7Lnlrm8tuPod9rlOxljVRnTo5dmFFgoYIMJGyq6WlEZ3EIngadbBY
AMO_REDIRECT_URI=http://bondio.ru/api/amo/callback
```

### Webhook настройки

1. **В Gupshup панели** установить webhook URL:
   ```
   http://bondio.ru/webhook/gupshup
   ```

2. **В AmoCRM** интеграция уже настроена с указанным redirect_uri

## 🧪 Тестирование

После запуска приложения доступны следующие тесты:

### 1. Тест подключений
- Нажать **"Тест Gupshup API"** - проверит доступность Gupshup API
- Нажать **"Тест AmoCRM API"** - проверит авторизацию в AmoCRM

### 2. OAuth авторизация AmoCRM
- Нажать **"Авторизоваться в AmoCRM"** для получения токенов
- После авторизации токены сохранятся автоматически

### 3. Отправка сообщений
- Ввести номер телефона (поддерживаются форматы +7, 8, или цифры)
- Написать текст сообщения
- Нажать **"Отправить в WhatsApp"**

### 4. Автоматическая интеграция
- При отправке/получении сообщений автоматически создаются:
  - Контакт в AmoCRM
  - Сделка с привязкой к контакту
  - Примечание с текстом сообщения

## 📁 Структура проекта

```
wabapp-mvp/
├── app.py                  # Основное Flask приложение
├── requirements.txt        # Python зависимости
├── .env                   # Переменные окружения
├── Dockerfile             # Docker образ
├── docker-compose.yml     # Многоконтейнерное развертывание
├── nginx.conf             # Nginx конфигурация
├── Makefile              # Управление проектом
├── templates/
│   ├── base.html         # Базовый HTML шаблон
│   └── index.html        # Главная страница
├── static/
│   ├── style.css         # CSS стили
│   └── script.js         # JavaScript функции
└── README.md             # Документация
```

## 🔌 API Endpoints

### Тестирование
- `GET /api/test/gupshup` - Тест Gupshup API
- `GET /api/test/amocrm` - Тест AmoCRM API
- `GET /api/status` - Статус системы

### Отправка сообщений
- `POST /api/send-message` - Отправить сообщение в WhatsApp

### AmoCRM OAuth
- `GET /api/amo/auth` - Начать авторизацию
- `GET /api/amo/callback` - OAuth callback

### Webhooks
- `POST /webhook/gupshup` - Входящие сообщения от Gupshup

## 🐳 Docker развертывание

### Локальное тестирование
```bash
# Запуск только приложения
docker build -t wabapp .
docker run -p 3001:3001 --env-file .env wabapp
```

### Продакшн развертывание
```bash
# Запуск с Nginx
make up  # или docker compose up -d --build
```

## ⚙️ Makefile команды

```bash
make          # Показать интерактивное меню
make up       # Собрать и запустить контейнеры
make down     # Остановить контейнеры
make logs     # Просмотр логов
make clean    # Полная очистка системы
make rebuild  # Полная пересборка
```

## 🔍 Логи и мониторинг

- **Веб-интерфейс**: Все операции отображаются в разделе "Логи операций"
- **Docker логи**: `make logs` или `docker compose logs -f`
- **Nginx логи**: В контейнере nginx в `/var/log/nginx/`

## 🚨 Troubleshooting

### Gupshup API не отвечает
1. Проверить правильность API ключа в .env
2. Убедиться что приложение активно в Gupshup панели
3. Проверить webhook URL в настройках Gupshup

### AmoCRM авторизация не работает
1. Проверить client_id и client_secret в .env
2. Убедиться что redirect_uri совпадает в .env и настройках интеграции AmoCRM
3. Проверить что интеграция активна в AmoCRM

### Контейнеры не запускаются
1. Проверить что Docker установлен и запущен
2. Убедиться что порты 80, 443, 3001 свободны
3. Проверить права доступа к файлам проекта

### Входящие сообщения не обрабатываются
1. Проверить webhook URL в Gupshup: `http://bondio.ru/webhook/gupshup`
2. Убедиться что домен доступен извне
3. Проверить логи на наличие ошибок webhook

## 📞 Техническая поддержка

При возникновении проблем:

1. Проверить логи через веб-интерфейс или `make logs`
2. Убедиться что все переменные окружения настроены правильно
3. Протестировать подключения через кнопки в интерфейсе

## 🎯 Что проверить после запуска

1. ✅ Открыть http://bondio.ru в браузере
2. ✅ Нажать "Тест Gupshup API" - должен показать статус "success"
3. ✅ Нажать "Авторизоваться в AmoCRM" и пройти OAuth
4. ✅ Нажать "Тест AmoCRM API" - должен показать данные аккаунта
5. ✅ Отправить тестовое сообщение на свой номер WhatsApp
6. ✅ Проверить что в AmoCRM создались контакт и сделка

**Результат**: Рабочая интеграция WhatsApp ↔ AmoCRM готова к использованию! 🎉
