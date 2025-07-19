#!/bin/bash

echo "🚀 WhatsApp ↔ Gupshup ↔ amoCRM MVP"
echo "=================================="

# Функция для проверки установки Node.js
check_node() {
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js не установлен!"
        echo "Установите Node.js версии 16+ с https://nodejs.org"
        exit 1
    fi

    NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_VERSION" -lt 16 ]; then
        echo "❌ Требуется Node.js версии 16+, текущая: $(node -v)"
        exit 1
    fi

    echo "✅ Node.js $(node -v) установлен"
}

# Функция установки зависимостей
install_deps() {
    echo "📦 Установка зависимостей..."
    npm install

    if [ $? -ne 0 ]; then
        echo "❌ Ошибка установки зависимостей"
        exit 1
    fi

    echo "✅ Зависимости установлены"
}

# Функция проверки .env
check_env() {
    if [ ! -f .env ]; then
        echo "⚠️  Файл .env не найден"
        echo "Создайте .env файл на основе примера:"
        echo "cp .env.example .env"
        echo "nano .env"
        return 1
    fi

    # Проверяем основные переменные
    if ! grep -q "GUPSHUP_API_KEY=ваш" .env || ! grep -q "AMO_SUBDOMAIN=ваш" .env; then
        echo "✅ Файл .env найден"
        return 0
    else
        echo "⚠️  Файл .env содержит примеры значений"
        echo "Отредактируйте .env файл с реальными данными:"
        echo "nano .env"
        return 1
    fi
}

# Функция выбора режима запуска
select_mode() {
    echo ""
    echo "Выберите режим запуска:"
    echo "1) Разработка (nodemon с автоперезапуском)"
    echo "2) Продакшен (обычный запуск)"
    echo "3) Продакшен (PM2 демон)"
    echo "4) Только проверка настроек"
    echo ""
    read -p "Введите номер (1-4): " choice

    case $choice in
        1)
            echo "🔧 Запуск в режиме разработки..."
            if command -v nodemon &> /dev/null; then
                npm run dev
            else
                echo "Installing nodemon..."
                npm install -g nodemon
                npm run dev
            fi
            ;;
        2)
            echo "🚀 Запуск в продакшен режиме..."
            NODE_ENV=production npm start
            ;;
        3)
            echo "⚙️ Запуск через PM2..."
            if ! command -v pm2 &> /dev/null; then
                echo "Установка PM2..."
                npm install -g pm2
            fi
            npm run pm2
            echo "Управление PM2:"
            echo "  pm2 status         - статус процессов"
            echo "  pm2 logs           - просмотр логов"
            echo "  pm2 restart all    - перезапуск"
            echo "  pm2 stop all       - остановка"
            ;;
        4)
            echo "🔍 Проверка настроек..."
            echo "✅ Настройки проверены"
            exit 0
            ;;
        *)
            echo "❌ Неверный выбор"
            exit 1
            ;;
    esac
}

# Основной процесс
main() {
    echo "Проверка системы..."
    check_node

    if [ ! -d "node_modules" ]; then
        install_deps
    else
        echo "✅ Зависимости уже установлены"
    fi

    if ! check_env; then
        echo ""
        echo "❌ Настройки не готовы. Настройте .env файл и запустите снова."
        exit 1
    fi

    echo "✅ Все проверки пройдены"
    select_mode
}

# Обработка Ctrl+C
trap 'echo "\n👋 Завершение работы..."; exit 0' INT

# Запуск
main
