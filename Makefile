# Makefile для управления проектом с интерактивным меню 🚀

.PHONY: help down up build rebuild logs clean push

# Цвета для оформления
GREEN = \033[0;32m
YELLOW = \033[0;33m
BLUE = \033[0;34m
NC = \033[0m # No Color

help:
	@printf "\n${YELLOW}ДОСТУПНЫЕ КОМАНДЫ:${NC}\n\n"
	@printf "${GREEN}1.${NC} 🛑  Остановить контейнеры (с удалением)\n"
	@printf "${GREEN}2.${NC} 🚀  Собрать и запустить контейнеры\n"
	@printf "${GREEN}3.${NC} 🔨  Только собрать контейнеры (с кэшем)\n"
	@printf "${GREEN}4.${NC} ♻️  Полная пересборка (очистка + сборка + запуск)\n"
	@printf "${GREEN}5.${NC} 📜  Просмотр логов\n"
	@printf "${GREEN}6.${NC} 🧹  Полная очистка (контейнеры, volumes, образы)\n"
	@printf "${GREEN}7.${NC} 📌  Git: Добавить, закоммитить и запушить изменения\n"
	@printf "${GREEN}0.${NC} ❌  Выход\n\n"
	@printf "${BLUE}Выберите действие (введите цифру):${NC} " && read choice; \
	case "$$choice" in \
		1) make down;; \
		2) make up;; \
		3) make build;; \
		4) make rebuild;; \
		5) make logs;; \
		6) make clean;; \
		7) make push;; \
		0) printf "\n👋 До свидания!\n";; \
		*) printf "\n❌ Неверный выбор, попробуйте снова\n"; make help;; \
	esac

# Остановка контейнеров с удалением
down:
	@printf "\n${YELLOW}🛑 Останавливаю контейнеры...${NC}\n"
	docker compose down --remove-orphans
	@printf "\n${GREEN}✅ Контейнеры успешно остановлены и удалены!${NC}\n"

# Сборка и запуск
up:
	@printf "\n${YELLOW}🚀 Запускаю сборку и запуск контейнеров...${NC}\n"
	docker compose up -d --build
	@printf "\n${GREEN}✅ Контейнеры собраны и запущены!${NC}\n"

# Только сборка с использованием кэша
build:
	@printf "\n${YELLOW}🔨 Собираю контейнеры (с кэшем)...${NC}\n"
	docker compose build --no-cache
	@printf "\n${GREEN}✅ Сборка завершена!${NC}\n"

# Полная пересборка
rebuild: down build up
	@printf "\n${GREEN}♻️  Пересборка успешно завершена!${NC}\n"

# Просмотр логов
logs:
	@printf "\n${YELLOW}📜 Открываю логи...${NC}\n"
	docker compose logs -f

# Очистка
clean:
	@printf "\n${YELLOW}🧹 Выполняю полную очистку...${NC}\n"
	docker compose down -v --rmi all --remove-orphans
	docker system prune -a -f
	@printf "\n${GREEN}✅ Система очищена!${NC}\n"

# Git: Добавить, закоммитить и запушить изменения
push:
	@printf "\n${YELLOW}📌 Подготавливаю git-коммит...${NC}\n"
	git add .
	git commit -m "Auto-commit: $$(date +'%Y-%m-%d %H:%M:%S')" || (printf "\n${YELLOW}⚠️  Нет изменений для коммита${NC}\n" && exit 0)
	git push
	@printf "\n${GREEN}✅ Изменения успешно отправлены на сервер!${NC}\n"

# Установка прав на исполнение
install:
	chmod +x $(shell pwd)/Makefile
	@printf "\n${GREEN}✅ Makefile готов к использованию!${NC}\n"