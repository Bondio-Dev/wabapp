#!/bin/bash
# Скрипт быстрого развертывания WhatsApp Business CRM Client

set -e

echo "🚀 Развертывание WhatsApp Business CRM Client"
echo "=============================================="

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функции
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Проверка зависимостей
check_dependencies() {
    log_info "Проверка зависимостей..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker не установлен. Установите Docker и попробуйте снова."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose не установлен. Установите Docker Compose и попробуйте снова."
        exit 1
    fi

    log_info "✅ Зависимости проверены"
}

# Настройка конфигурации
setup_config() {
    log_info "Настройка конфигурации..."

    if [ ! -f .env ]; then
        cp config/.env.example .env
        log_warn "Создан файл .env из примера"
        log_warn "ВАЖНО: Отредактируйте .env файл с вашими API ключами перед продолжением!"

        read -p "Хотите отредактировать .env файл сейчас? (y/N): " edit_env
        if [[ $edit_env =~ ^[Yy]$ ]]; then
            ${EDITOR:-nano} .env
        else
            log_warn "Не забудьте отредактировать .env файл перед запуском!"
            return
        fi
    else
        log_info "✅ Файл .env уже существует"
    fi
}

# Сборка образов
build_images() {
    log_info "Сборка Docker образов..."
    docker-compose build --no-cache
    log_info "✅ Образы собраны"
}

# Запуск сервисов
start_services() {
    log_info "Запуск сервисов..."
    docker-compose up -d
    log_info "✅ Сервисы запущены"
}

# Проверка здоровья
health_check() {
    log_info "Проверка здоровья сервисов..."

    # Ждем запуска сервисов
    sleep 10

    # Проверяем backend
    for i in {1..30}; do
        if curl -s http://localhost:3001/health > /dev/null; then
            log_info "✅ Backend API работает"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "❌ Backend API не отвечает"
            return 1
        fi
        sleep 2
    done

    # Проверяем frontend
    if curl -s http://localhost:3000 > /dev/null; then
        log_info "✅ Frontend работает"
    else
        log_warn "⚠️  Frontend может быть еще не готов"
    fi

    # Проверяем Netdata
    if curl -s http://localhost:19999 > /dev/null; then
        log_info "✅ Netdata мониторинг работает"
    else
        log_warn "⚠️  Netdata может быть еще не готов"
    fi
}

# Вывод информации о доступе
show_access_info() {
    log_info "🎉 Развертывание завершено!"
    echo ""
    echo "Доступ к сервисам:"
    echo "  📱 Веб-клиент:     http://localhost:3000"
    echo "  🔧 API Backend:    http://localhost:3001"
    echo "  📊 Мониторинг:     http://localhost:19999"
    echo ""
    echo "Для просмотра логов: docker-compose logs -f"
    echo "Для остановки:       docker-compose down"
    echo ""
    log_warn "Не забудьте настроить webhook URLs в Gupshup и AMO CRM!"
}

# Основной процесс развертывания
main() {
    check_dependencies
    setup_config
    build_images
    start_services
    health_check
    show_access_info
}

# Обработка аргументов
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "config")
        setup_config
        ;;
    "build")
        build_images
        ;;
    "start")
        start_services
        ;;
    "health")
        health_check
        ;;
    "info")
        show_access_info
        ;;
    *)
        echo "Использование: $0 [deploy|config|build|start|health|info]"
        echo ""
        echo "Команды:"
        echo "  deploy  - Полное развертывание (по умолчанию)"
        echo "  config  - Только настройка конфигурации"
        echo "  build   - Только сборка образов"
        echo "  start   - Только запуск сервисов"
        echo "  health  - Проверка здоровья"
        echo "  info    - Показать информацию о доступе"
        exit 1
        ;;
esac
