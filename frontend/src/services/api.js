import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Создаем экземпляр axios
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

// Interceptor для автоматического добавления токена
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor для обработки ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Сообщения
export const messagesAPI = {
  // Получить сообщения чата
  getMessages: (chatId, limit = 50, offset = 0) =>
    api.get(`/api/messages/chat/${chatId}`, { params: { limit, offset } }),

  // Отправить текстовое сообщение
  sendMessage: (phoneNumber, message, chatId) =>
    api.post('/api/messages/send', { phoneNumber, message, chatId }),

  // Отправить медиа файл
  sendMediaMessage: (phoneNumber, mediaUrl, mediaType, caption, chatId) =>
    api.post('/api/messages/send-media', { 
      phoneNumber, mediaUrl, mediaType, caption, chatId 
    }),

  // Отправить шаблонное сообщение
  sendTemplateMessage: (phoneNumber, templateName, templateParams, chatId) =>
    api.post('/api/messages/send-template', { 
      phoneNumber, templateName, templateParams, chatId 
    }),

  // Получить статус сообщения
  getMessageStatus: (messageId) =>
    api.get(`/api/messages/status/${messageId}`),

  // Пометить сообщения как прочитанные
  markMessagesAsRead: (chatId, messageIds) =>
    api.post('/api/messages/mark-read', { chatId, messageIds }),
};

// Контакты
export const contactsAPI = {
  // Получить список контактов/чатов
  getContacts: (limit = 100) =>
    api.get('/api/contacts', { params: { limit } }),

  // Получить информацию о контакте
  getContact: (phoneNumber) =>
    api.get(`/api/contacts/${phoneNumber}`),

  // Создать новый контакт
  createContact: (phoneNumber, name) =>
    api.post('/api/contacts', { phoneNumber, name }),

  // Обновить контакт
  updateContact: (phoneNumber, name) =>
    api.put(`/api/contacts/${phoneNumber}`, { name }),

  // Поиск контактов
  searchContacts: (query, limit = 20) =>
    api.get(`/api/contacts/search/${query}`, { params: { limit } }),
};

// AMO CRM
export const amoAPI = {
  // Получить контакт из AMO
  getContact: (phoneNumber) =>
    api.get(`/api/amo/contact/${phoneNumber}`),

  // Создать контакт в AMO
  createContact: (phoneNumber, name, email) =>
    api.post('/api/amo/contact', { phoneNumber, name, email }),

  // Получить сделку из AMO
  getLead: (leadId) =>
    api.get(`/api/amo/lead/${leadId}`),

  // Создать сделку в AMO
  createLead: (name, phoneNumber, contactId, price, description) =>
    api.post('/api/amo/lead', { name, phoneNumber, contactId, price, description }),

  // Добавить примечание к сделке
  addNoteToLead: (leadId, text, noteType = 'common') =>
    api.post(`/api/amo/lead/${leadId}/note`, { text, noteType }),

  // Получить воронки
  getPipelines: () =>
    api.get('/api/amo/pipelines'),

  // Получить пользователей
  getUsers: () =>
    api.get('/api/amo/users'),

  // Обновить токен
  refreshToken: () =>
    api.post('/api/amo/refresh-token'),

  // Проверить подключение
  testConnection: () =>
    api.get('/api/amo/test-connection'),
};

// Аутентификация
export const authAPI = {
  // Вход в систему
  login: (username, password) =>
    api.post('/api/auth/login', { username, password }),

  // Выход из системы
  logout: () =>
    api.post('/api/auth/logout'),

  // Проверка токена
  verify: () =>
    api.get('/api/auth/verify'),
};

// Системные API
export const systemAPI = {
  // Проверка здоровья
  health: () =>
    api.get('/health'),

  // Детальная проверка
  healthDetailed: () =>
    api.get('/health/detailed'),

  // Метрики
  metrics: () =>
    api.get('/health/metrics'),
};

export default api;
