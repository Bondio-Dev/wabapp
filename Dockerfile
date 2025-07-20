# WhatsApp AmoCRM Integration Dockerfile
FROM python:3.11-slim

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Создание рабочей директории
WORKDIR /app

# Копирование requirements и установка Python зависимостей
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копирование приложения
COPY . .

# Создание пользователя для безопасности
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

# Порт приложения
EXPOSE 3001

# Переменные окружения
ENV PYTHONPATH=/app
ENV FLASK_APP=app.py

# Команда запуска
CMD ["gunicorn", "--bind", "0.0.0.0:3001", "--workers", "2", "--timeout", "120", "app:app"]
