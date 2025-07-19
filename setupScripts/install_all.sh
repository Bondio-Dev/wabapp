#!/bin/bash

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

error_handler() {
  echo -e "${RED}[ERROR]${NC} Ошибка в строке $1, код выхода $2"
  exit 1
}

trap 'error_handler $LINENO $?' ERR

header() {
  echo -e "${YELLOW}===[ $1 ]===${NC}"
}

success() {
  echo -e "${GREEN}✓${NC} $1"
}

# Обновление системы
header "ОБНОВЛЕНИЕ СИСТЕМЫ"
echo "Обновление списка пакетов..."
sudo apt-get update -qq || {
  echo -e "${RED}Ошибка обновления списка пакетов!${NC}"
  exit 1
}
success "Список пакетов обновлён"

echo "Обновление установленных пакетов..."
sudo apt-get upgrade -y -qq || {
  echo -e "${RED}Ошибка обновления пакетов!${NC}"
  exit 1
}
success "Система обновлена"

# Установка зависимостей
header "УСТАНОВКА ЗАВИСИМОСТЕЙ"
install_pkgs=(
  curl build-essential libssl-dev zlib1g-dev
  libbz2-dev libreadline-dev libsqlite3-dev wget llvm
  libncurses5-dev libncursesw5-dev xz-utils tk-dev
  libffi-dev liblzma-dev ca-certificates gnupg lsb-release
)

echo "Установка основных зависимостей..."
sudo apt-get install -y -qq "${install_pkgs[@]}" || {
  echo -e "${RED}Ошибка установки зависимостей!${NC}"
  exit 1
}
success "Основные зависимости установлены"

# Установка Git
header "УСТАНОВКА GIT"
echo "Установка системы контроля версий..."
sudo apt-get install -y -qq git || {
  echo -e "${RED}Ошибка установки Git!${NC}"
  exit 1
}
success "Git установлен (версия: $(git --version | awk '{print $3}'))"

# Установка Docker
header "УСТАНОВКА DOCKER"
echo "Скачивание установочного скрипта..."
curl -fsSL https://get.docker.com -o get-docker.sh || {
  echo -e "${RED}Ошибка загрузки Docker!${NC}"
  exit 1
}

echo "Установка Docker..."
sudo sh get-docker.sh >/dev/null || {
  echo -e "${RED}Ошибка установки Docker!${NC}"
  exit 1
}
rm get-docker.sh

echo "Настройка службы Docker..."
sudo systemctl enable docker --now >/dev/null || {
  echo -e "${RED}Ошибка настройки службы Docker!${NC}"
  exit 1
}
success "Docker установлен (версия: $(docker --version | awk '{print $3}' | tr -d ','))"

# Настройка прав Docker
header "НАСТРОЙКА ПРАВ DOCKER"
echo "Добавление пользователя в группу docker..."
sudo usermod -aG docker "${USER}" || {
  echo -e "${RED}Ошибка добавления в группу docker!${NC}"
  exit 1
}
success "Пользователь ${USER} добавлен в группу docker"

# Установка Docker Compose
header "УСТАНОВКА DOCKER COMPOSE"
echo "Попытка установки через пакетный менеджер..."
if ! sudo apt-get install -y -qq docker-compose-plugin; then
  echo "Альтернативная установка из GitHub..."
  sudo mkdir -p /usr/local/lib/docker/cli-plugins || true
  sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m) \
    -o /usr/local/lib/docker/cli-plugins/docker-compose || {
    echo -e "${RED}Ошибка загрузки Docker Compose!${NC}"
    exit 1
  }
  sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
fi
success "Docker Compose установлен (версия: $(docker compose version | awk '{print $4}'))"

# Установка Python
header "УСТАНОВКА PYTHON 3.13.2"
echo "Скачивание исходного кода Python..."
wget -q https://www.python.org/ftp/python/3.13.2/Python-3.13.2.tgz || {
  echo -e "${RED}Ошибка загрузки Python!${NC}"
  exit 1
}

echo "Распаковка архива..."
tar -xf Python-3.13.2.tgz || {
  echo -e "${RED}Ошибка распаковки архива!${NC}"
  exit 1
}

cd Python-3.13.2 || exit 1

echo "Конфигурация сборки..."
./configure --prefix=/usr/local --enable-optimizations --with-ensurepip=install >/dev/null || {
  echo -e "${RED}Ошибка конфигурации Python!${NC}"
  exit 1
}

echo "Компиляция Python (это может занять время)..."
make -j "$(nproc)" >/dev/null || {
  echo -e "${RED}Ошибка компиляции Python!${NC}"
  exit 1
}

echo "Установка Python..."
sudo make altinstall >/dev/null || {
  echo -e "${RED}Ошибка установки Python!${NC}"
  exit 1
}

cd .. || exit 1
sudo rm -rf Python-3.13.2 Python-3.13.2.tgz
success "Python 3.13.2 установлен"

# Настройка системных ссылок
header "НАСТРОЙКА ССЫЛОК"
echo "Создание системных ссылок..."
sudo ln -sf /usr/local/bin/python3.13 /usr/local/bin/python3 || {
  echo -e "${RED}Ошибка создания ссылки python3!${NC}"
  exit 1
}

sudo ln -sf /usr/local/bin/pip3.13 /usr/local/bin/pip3 || {
  echo -e "${RED}Ошибка создания ссылки pip3!${NC}"
  exit 1
}
success "Системные ссылки созданы"

# Установка pydf
header "УСТАНОВКА PYDF"
echo "Установка утилиты для отображения дискового пространства..."
sudo apt-get install -y -qq pydf >/dev/null || {
  echo -e "${RED}Ошибка установки pydf!${NC}"
  exit 1
}
success "pydf установлен"

# Финальная проверка
header "ПРОВЕРКА УСТАНОВКИ"
echo -e "${YELLOW}Версии установленного ПО:${NC}"
echo "Git: $(git --version)"
echo "Docker: $(docker --version)"
echo "Docker Compose: $(docker compose version)"
echo "Python: $(python3 --version)"
echo "Pip: $(pip3 --version)"
echo -e "\n${YELLOW}Дисковое пространство:${NC}"
sudo pydf

header "ЗАВЕРШЕНО"
echo -e "${GREEN}✓✓✓ Все компоненты успешно установлены ✓✓✓${NC}"
