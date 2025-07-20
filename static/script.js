// WhatsApp AmoCRM Integration JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Проверяем статус при загрузке страницы
    checkSystemStatus();

    // Настраиваем форму отправки сообщений
    const messageForm = document.getElementById('message-form');
    if (messageForm) {
        messageForm.addEventListener('submit', handleMessageSubmit);
    }

    // Периодически обновляем статус
    setInterval(checkSystemStatus, 30000); // каждые 30 секунд
});

// Проверка статуса системы
async function checkSystemStatus() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();

        updateStatusIndicator('gupshup-status', data.config.gupshup_configured);
        updateStatusIndicator('amocrm-status', data.config.amocrm_authorized);

    } catch (error) {
        console.error('Ошибка проверки статуса:', error);
        updateStatusIndicator('gupshup-status', false);
        updateStatusIndicator('amocrm-status', false);
    }
}

// Обновление индикатора статуса
function updateStatusIndicator(elementId, isConnected) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const icon = element.querySelector('i');
    if (isConnected) {
        icon.className = 'fas fa-circle status-connected';
        element.title = 'Подключено';
    } else {
        icon.className = 'fas fa-circle status-disconnected';
        element.title = 'Не подключено';
    }
}

// Тестирование Gupshup API
async function testGupshup() {
    const testResults = document.getElementById('test-results');

    addLog('Тестирование подключения к Gupshup API...', 'info');

    try {
        const response = await fetch('/api/test/gupshup');
        const result = await response.json();

        if (result.success) {
            addLog('✅ Gupshup API: Подключение успешно', 'success');
            showResultModal('Тест Gupshup API - Успешно', JSON.stringify(result, null, 2));
        } else {
            addLog(`❌ Gupshup API: ${result.error}`, 'error');
            showResultModal('Тест Gupshup API - Ошибка', JSON.stringify(result, null, 2));
        }

    } catch (error) {
        addLog(`❌ Ошибка тестирования Gupshup: ${error.message}`, 'error');
        showResultModal('Тест Gupshup API - Ошибка сети', error.toString());
    }
}

// Тестирование AmoCRM API
async function testAmoCRM() {
    addLog('Тестирование подключения к AmoCRM API...', 'info');

    try {
        const response = await fetch('/api/test/amocrm');
        const result = await response.json();

        if (result.success) {
            addLog('✅ AmoCRM API: Подключение успешно', 'success');
            showResultModal('Тест AmoCRM API - Успешно', JSON.stringify(result, null, 2));
        } else {
            addLog(`❌ AmoCRM API: ${result.error || 'Неизвестная ошибка'}`, 'error');
            showResultModal('Тест AmoCRM API - Ошибка', JSON.stringify(result, null, 2));
        }

    } catch (error) {
        addLog(`❌ Ошибка тестирования AmoCRM: ${error.message}`, 'error');
        showResultModal('Тест AmoCRM API - Ошибка сети', error.toString());
    }
}

// Обработка отправки сообщения
async function handleMessageSubmit(event) {
    event.preventDefault();

    const phone = document.getElementById('phone').value.trim();
    const message = document.getElementById('message').value.trim();
    const submitBtn = event.target.querySelector('button[type="submit"]');

    if (!phone || !message) {
        addLog('❌ Заполните все поля', 'error');
        return;
    }

    // Показываем индикатор загрузки
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Отправляем...';

    addLog(`Отправка сообщения на ${phone}: ${message.substring(0, 50)}...`, 'info');

    try {
        const response = await fetch('/api/send-message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                phone: phone,
                message: message
            })
        });

        const result = await response.json();

        if (result.success) {
            addLog(`✅ Сообщение отправлено на ${phone}`, 'success');
            document.getElementById('message-form').reset();
            showResultModal('Сообщение отправлено', JSON.stringify(result, null, 2));
        } else {
            addLog(`❌ Ошибка отправки: ${result.error}`, 'error');
            showResultModal('Ошибка отправки сообщения', JSON.stringify(result, null, 2));
        }

    } catch (error) {
        addLog(`❌ Ошибка сети: ${error.message}`, 'error');
        showResultModal('Ошибка сети', error.toString());
    } finally {
        // Восстанавливаем кнопку
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// Добавление записи в лог
function addLog(message, type = 'info') {
    const logsContainer = document.getElementById('logs');
    if (!logsContainer) return;

    // Создаем элемент лога
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;

    const timestamp = new Date().toLocaleTimeString();
    logEntry.innerHTML = `
        <span class="log-timestamp">[${timestamp}]</span>
        ${message}
    `;

    // Удаляем заглушку если есть
    const placeholder = logsContainer.querySelector('.text-muted');
    if (placeholder) {
        placeholder.remove();
    }

    // Добавляем в начало списка
    logsContainer.insertBefore(logEntry, logsContainer.firstChild);

    // Ограничиваем количество записей
    const entries = logsContainer.querySelectorAll('.log-entry');
    if (entries.length > 50) {
        entries[entries.length - 1].remove();
    }
}

// Очистка логов
function clearLogs() {
    const logsContainer = document.getElementById('logs');
    if (logsContainer) {
        logsContainer.innerHTML = '<div class="text-muted">Логи операций будут отображаться здесь...</div>';
    }
}

// Показ модального окна с результатами
function showResultModal(title, content) {
    const modal = new bootstrap.Modal(document.getElementById('resultModal'));
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalContent').textContent = content;
    modal.show();
}

// Утилиты для работы с телефонными номерами
function formatPhone(phone) {
    // Удаляем все не цифры
    const digits = phone.replace(/\D/g, '');

    // Форматируем в зависимости от длины
    if (digits.length === 11 && digits.startsWith('7')) {
        return '+7 (' + digits.slice(1, 4) + ') ' + digits.slice(4, 7) + '-' + digits.slice(7, 9) + '-' + digits.slice(9);
    } else if (digits.length === 11 && digits.startsWith('8')) {
        return '+7 (' + digits.slice(1, 4) + ') ' + digits.slice(4, 7) + '-' + digits.slice(7, 9) + '-' + digits.slice(9);
    }

    return phone;
}

// Автоформатирование телефона при вводе
document.addEventListener('DOMContentLoaded', function() {
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            const formatted = formatPhone(e.target.value);
            if (formatted !== e.target.value) {
                const cursorPos = e.target.selectionStart;
                e.target.value = formatted;
                e.target.setSelectionRange(cursorPos, cursorPos);
            }
        });
    }
});