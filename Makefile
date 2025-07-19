# Makefile для управления Docker Compose с интерактивным меню

.PHONY: help down up build rebuild logs clean

help:
	@echo "Выберите действие (введите цифру):"
	@echo "1. Остановить контейнеры (с удалением)"
	@echo "2. Собрать и запустить контейнеры"
	@echo "3. Только собрать контейнеры (с кэшем)"
	@echo "4. Полная пересборка (очистка + сборка + запуск)"
	@echo "5. Просмотр логов"
	@echo "6. Полная очистка (контейнеры, volumes, образы)"
	@echo "0. Выход"
	@read -p "Ваш выбор: " choice; \
	case "$$choice" in \
		1) make down;; \
		2) make up;; \
		3) make build;; \
		4) make rebuild;; \
		5) make logs;; \
		6) make clean;; \
		0) echo "Выход";; \
		*) echo "Неверный выбор";; \
	esac

# Остановка контейнеров с удалением (--remove-orphans)
down:
	docker compose down --remove-orphans

# Сборка с кэшем (--cache-from) и запуск (-d)
up:
	docker compose up -d --build

# Только сборка с использованием кэша
build:
	docker compose build --no-cache

# Полная пересборка с кэшем и запуском
rebuild: down build up

# Просмотр логов (добавьте сервис при необходимости)
logs:
	docker compose logs -f

# Очистка (контейнеры, сети, volumes, неиспользуемые образы)
clean:
	docker compose down -v --rmi all --remove-orphans
	docker system prune -a -f
