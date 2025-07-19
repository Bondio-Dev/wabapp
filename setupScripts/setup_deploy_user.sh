#!/bin/bash

set -euo pipefail

DEPLOY_USER="docker-deploy"
KEY_NAME="deploy_key"
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

# Удаление предыдущего пользователя
if id "$DEPLOY_USER" &>/dev/null; then
  header "УДАЛЕНИЕ ПРЕДЫДУЩЕЙ ВЕРСИИ ПОЛЬЗОВАТЕЛЯ"
  
  # Завершение всех процессов пользователя
  if pgrep -u "$DEPLOY_USER" >/dev/null; then
    echo "Найдены активные процессы пользователя:"
    ps -fp $(pgrep -u "$DEPLOY_USER") || true
    echo "Завершаю процессы..."
    sudo pkill -9 -u "$DEPLOY_USER" 2>/dev/null || true
    sudo systemctl kill --kill-who=all "user@$(id -u $DEPLOY_USER).service" 2>/dev/null || true
  fi

  echo "Удаляю пользователя $DEPLOY_USER..."
  if sudo deluser --remove-home "$DEPLOY_USER" 2>/dev/null; then
    success "Пользователь удалён"
  else
    echo -e "${RED}Ошибка удаления пользователя!${NC}"
    echo "Попытка принудительного удаления..."
    sudo deluser "$DEPLOY_USER" 2>/dev/null || true
    sudo rm -rf /home/"$DEPLOY_USER" || true
  fi
fi

# Создание нового пользователя
header "СОЗДАНИЕ НОВОГО ПОЛЬЗОВАТЕЛЯ"
echo "Создаю пользователя $DEPLOY_USER..."
sudo useradd -m -s /bin/bash "$DEPLOY_USER" || {
  echo -e "${RED}Ошибка создания пользователя!${NC}"
  exit 1
}
success "Пользователь создан"

# Настройка прав
header "НАСТРОЙКА ПРАВ"
echo "Добавляю в группу docker..."
sudo usermod -aG docker "$DEPLOY_USER" || {
  echo -e "${RED}Ошибка добавления в группу docker!${NC}"
  exit 1
}
success "Права docker назначены"

# Создание SSH-структуры
header "НАСТРОЙКА SSH"
echo "Создаю .ssh директорию..."
sudo -u "$DEPLOY_USER" mkdir -p /home/$DEPLOY_USER/.ssh || {
  echo -e "${RED}Ошибка создания .ssh директории!${NC}"
  exit 1
}
sudo chmod 700 /home/$DEPLOY_USER/.ssh
sudo chown $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/.ssh
success "SSH директория создана"

# Генерация ключей
header "ГЕНЕРАЦИЯ КЛЮЧЕЙ"
echo "Генерирую SSH-ключи..."
sudo -u "$DEPLOY_USER" ssh-keygen -t ed25519 \
  -f /home/$DEPLOY_USER/.ssh/$KEY_NAME \
  -N "" \
  -C "deploy-$(hostname)" \
  -q <<< y || {
  echo -e "${RED}Ошибка генерации ключей!${NC}"
  exit 1
}
success "SSH-ключи сгенерированы"

# Настройка authorized_keys
header "НАСТРОЙКА AUTHORIZED_KEYS"
sudo -u "$DEPLOY_USER" cat /home/$DEPLOY_USER/.ssh/${KEY_NAME}.pub \
  | sudo -u "$DEPLOY_USER" tee -a /home/$DEPLOY_USER/.ssh/authorized_keys >/dev/null
sudo chmod 600 /home/$DEPLOY_USER/.ssh/authorized_keys
success "Публичный ключ добавлен"

# Вывод информации
header "ИНФОРМАЦИЯ ДЛЯ НАСТРОЙКИ"
echo -e "Добавь эти значения в ${YELLOW}GitHub Secrets${NC}:"
echo "============================================================"
echo -e "${GREEN}SSH_PRIVATE_KEY${NC} ="
sudo cat /home/$DEPLOY_USER/.ssh/$KEY_NAME
echo "------------------------------------------------------------"
echo -e "${GREEN}SSH_USER${NC} = $DEPLOY_USER"
echo "------------------------------------------------------------"
EXTERNAL_IP=$(curl -s ifconfig.me)
echo -e "${GREEN}SSH_HOST${NC} = $EXTERNAL_IP"
echo "============================================================"

echo -e "\nПроверка созданных файлов:"
sudo ls -la /home/$DEPLOY_USER/.ssh

header "ЗАВЕРШЕНО"
echo -e "${GREEN}✓✓✓ Настройка пользователя для деплоя завершена успешно ✓✓✓${NC}"
