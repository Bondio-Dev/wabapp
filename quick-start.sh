#!/bin/bash

echo "🚀 Быстрый запуск WhatsApp Business API MVP"
echo "============================================"

# Проверяем Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Установите Docker и Docker Compose."
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo "❌ Docker Compose не установлен. Установите Docker Compose."
    exit 1
fi

# Создаем необходимые директории
mkdir -p uploads logs

# Проверяем .env файл
if [ ! -f ".env" ]; then
    echo "📝 Создаем .env файл из шаблона..."
    cp .env .env
    echo "⚠️  Отредактируйте .env файл с вашими настройками AMO CRM и Gupshup"
fi

echo "🔧 Настройка для localhost..."
echo ""
echo "Выберите режим запуска:"
echo "1) localhost (для разработки на локальной машине)"
echo "2) реальный IP 83.166.238.230 (для продакшн сервера)"
read -p "Введите номер (1 или 2): " choice

if [ "$choice" = "1" ]; then
    echo "🏠 Настройка для localhost..."

    # Создаем .env для localhost
    cat > .env << EOF
NODE_ENV=development
SERVER_IP=localhost
BACKEND_PORT=3001
FRONTEND_PORT=3000

BASE_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
REACT_APP_API_URL=http://localhost:3001
REACT_APP_WS_URL=ws://localhost:3001

CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# AMO CRM (заполните своими данными)
AMO_SUBDOMAIN=your_subdomain
AMO_CLIENT_ID=your_client_id
AMO_CLIENT_SECRET=your_client_secret

# Gupshup (заполните своими данными)
GUPSHUP_API_KEY=your_api_key
GUPSHUP_APP_NAME=your_app_name

# JWT секрет
JWT_SECRET=your_very_long_jwt_secret_key_here_at_least_32_chars
EOF

    echo "✅ Конфигурация для localhost готова!"

elif [ "$choice" = "2" ]; then
    echo "🌐 Настройка для реального IP 83.166.238.230..."

    # Создаем .env для реального сервера
    cat > .env << EOF
NODE_ENV=production
SERVER_IP=83.166.238.230
BACKEND_PORT=3001
FRONTEND_PORT=3000

BASE_URL=http://83.166.238.230:3001
FRONTEND_URL=http://83.166.238.230:3000
REACT_APP_API_URL=http://83.166.238.230:3001
REACT_APP_WS_URL=ws://83.166.238.230:3001

CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://83.166.238.230:3000

# AMO CRM (заполните своими данными)
AMO_SUBDOMAIN=your_subdomain
AMO_CLIENT_ID=your_client_id
AMO_CLIENT_SECRET=your_client_secret

# Gupshup (заполните своими данными)
GUPSHUP_API_KEY=your_api_key
GUPSHUP_APP_NAME=your_app_name

# JWT секрет
JWT_SECRET=your_very_long_jwt_secret_key_here_at_least_32_chars
EOF

    echo "✅ Конфигурация для реального IP готова!"

else
    echo "❌ Неверный выбор. Выберите 1 или 2."
    exit 1
fi

echo ""
echo "⚠️  ВАЖНО: Отредактируйте .env файл и заполните ваши реальные данные:"
echo "   - AMO_SUBDOMAIN (поддомен вашего AMO CRM)"
echo "   - AMO_CLIENT_ID (Client ID из интеграции AMO)"
echo "   - AMO_CLIENT_SECRET (Client Secret из интеграции AMO)"
echo "   - GUPSHUP_API_KEY (API ключ от Gupshup)"
echo "   - GUPSHUP_APP_NAME (название приложения в Gupshup)"
echo ""

read -p "Нажмите Enter когда отредактируете .env файл..."

echo "🏗️  Сборка и запуск контейнеров..."

# Останавливаем существующие контейнеры
docker compose down 2>/dev/null

# Собираем и запускаем
docker compose up --build -d

echo ""
echo "⏳ Ожидаем запуск сервисов..."
sleep 10

# Проверяем статус
echo "📊 Статус контейнеров:"
docker compose ps

echo ""
echo "🎉 Запуск завершен!"
echo ""

if [ "$choice" = "1" ]; then
    echo "📱 Веб-интерфейс: http://localhost:3000"
    echo "🔗 API Backend: http://localhost:3001"
    echo "❤️  Health Check: http://localhost:3001/health"
else
    echo "📱 Веб-интерфейс: http://83.166.238.230:3000"
    echo "🔗 API Backend: http://83.166.238.230:3001"
    echo "❤️  Health Check: http://83.166.238.230:3001/health"
fi

echo ""
echo "📚 Для настройки AMO CRM:"

if [ "$choice" = "1" ]; then
    echo "   1. Перейдите в http://localhost:3001/api/amo/auth"
else
    echo "   1. Перейдите в http://83.166.238.230:3001/api/amo/auth"
fi

echo "   2. Скопируйте URL авторизации"
echo "   3. Пройдите авторизацию в AMO CRM"
echo ""
echo "🔧 Управление:"
echo "   docker compose logs -f    (логи)"
echo "   docker compose down       (остановка)"
echo "   docker compose restart    (перезапуск)"
echo ""
