# WhatsApp Business CRM Client - Makefile
SHELL := /bin/bash
.PHONY: help build start stop restart logs clean setup dev test

# Colors for output
GREEN=\033[0;32m
YELLOW=\033[1;33m
RED=\033[0;31m
NC=\033[0m # No Color

help: ## Показать эту справку
	@echo "$(GREEN)WhatsApp Business CRM Client$(NC)"
	@echo ""
	@echo "Доступные команды:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Собрать все Docker образы
	@echo "$(GREEN)Сборка Docker образов...$(NC)"
	docker compose build --no-cache

start: ## Запустить все сервисы
	@echo "$(GREEN)Запуск сервисов...$(NC)"
	docker compose up -d
	@echo "$(GREEN)Сервисы запущены!$(NC)"
	@echo "Веб-клиент: http://localhost:3000"
	@echo "API: http://localhost:3001"
	@echo "Netdata: http://localhost:19999"

stop: ## Остановить все сервисы
	@echo "$(YELLOW)Остановка сервисов...$(NC)"
	docker compose down

restart: stop start ## Перезапустить все сервисы

logs: ## Показать логи всех сервисов
	docker compose logs -f

logs-backend: ## Показать только логи backend
	docker compose logs -f backend

logs-frontend: ## Показать только логи frontend  
	docker compose logs -f frontend

status: ## Показать статус сервисов
	docker compose ps

clean: ## Очистить все данные
	@echo "$(RED)ВНИМАНИЕ: Это удалит ВСЕ данные!$(NC)"
	@read -p "Продолжить? [y/N]: " confirm && [ "$$confirm" = "y" ]
	docker compose down -v
	docker system prune -f
	docker volume prune -f

setup: ## Первоначальная настройка
	@echo "$(GREEN)Настройка проекта...$(NC)"
	@if [ ! -f .env ]; then \
		cp config/.env.example .env; \
		echo "$(YELLOW)Скопирован .env.example -> .env$(NC)"; \
		echo "$(YELLOW)Отредактируйте файл .env перед запуском!$(NC)"; \
	fi
	@echo "$(GREEN)Готово! Запустите 'make start' для старта$(NC)"

dev: ## Запуск в режиме разработки
	@echo "$(GREEN)Запуск в режиме разработки...$(NC)"
	docker compose -f docker compose.yml -f docker compose.dev.yml up

test: ## Запустить тесты
	@echo "$(GREEN)Запуск тестов...$(NC)"
	docker compose exec backend npm test
	docker compose exec frontend npm test

health: ## Проверить здоровье сервисов
	@echo "$(GREEN)Проверка здоровья сервисов...$(NC)"
	@curl -s http://localhost:3001/health | jq . || echo "Backend недоступен"
	@curl -s http://localhost:3000 > /dev/null && echo "Frontend: OK" || echo "Frontend: ERROR"
	@curl -s http://localhost:19999/api/v1/info > /dev/null && echo "Netdata: OK" || echo "Netdata: ERROR"

backup: ## Создать бэкап базы данных
	@echo "$(GREEN)Создание бэкапа...$(NC)"
	docker compose exec postgres pg_dump -U whatsapp_user whatsapp_client > backup_$$(date +%Y%m%d_%H%M%S).sql

restore: ## Восстановить из бэкапа (BACKUP_FILE=filename.sql make restore)
	@echo "$(GREEN)Восстановление из бэкапа...$(NC)"
	@if [ -z "$(BACKUP_FILE)" ]; then \
		echo "$(RED)Ошибка: Укажите файл бэкапа: BACKUP_FILE=filename.sql make restore$(NC)"; \
		exit 1; \
	fi
	docker compose exec -T postgres psql -U whatsapp_user whatsapp_client < $(BACKUP_FILE)

install: setup build start ## Полная установка (setup + build + start)

update: ## Обновить проект
	@echo "$(GREEN)Обновление проекта...$(NC)"
	git pull
	docker compose build
	docker compose up -d

# Команды для разработки
dev-backend: ## Запустить только backend для разработки
	cd backend && npm run dev

dev-frontend: ## Запустить только frontend для разработки
	cd frontend && npm start

shell-backend: ## Войти в shell backend контейнера
	docker compose exec backend sh

shell-frontend: ## Войти в shell frontend контейнера  
	docker compose exec frontend sh

shell-db: ## Войти в PostgreSQL
	docker compose exec postgres psql -U whatsapp_user whatsapp_client

# Мониторинг
monitor: ## Открыть Netdata в браузере
	@echo "$(GREEN)Открытие Netdata...$(NC)"
	@python -c "import webbrowser; webbrowser.open('http://localhost:19999')"

dashboard: ## Открыть веб-клиент в браузере
	@echo "$(GREEN)Открытие веб-клиента...$(NC)"
	@python -c "import webbrowser; webbrowser.open('http://localhost:3000')"
