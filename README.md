
## Установка  
0. Если сервер чистый сгенерируйте ssh ключ и добавьте в репозиторий:
```bash  
ssh-keygen -t ed25519 -C "$(hostname)_$(whoami)" -f ~/.ssh/github_ed25519 -N ""
cat ~/.ssh/github_ed25519.pub   
```
0. Запустите ssh демона :  
```bash  
eval $(ssh-agent) 
ssh-add ~/.ssh/github_ed25519 
ssh-add -l
```
1. Клонируйте репозиторий:  
```bash  
git clone git@github.com:Bondio-Dev/lobzik-tg-bot.git
chmod +x lobzik-tg-bot/install_all.sh
chmod +x lobzik-tg-bot/setup_deploy_user.sh
./lobzik-tg-bot/setup_deploy_user.sh
./lobzik-tg-bot/install_all.sh  
```  

2. Запустите систему с помощью Docker Compose:  
```bash
cd lobzik-tg-bot
docker compose build  
docker compose up -d  
```  

3. Просмотр логов:  
```bash  
docker compose logs -f  
```  

4. Остановка контейнеров:  
```bash  
docker compose down --remove-orphans  
```  
