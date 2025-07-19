import { useMemo } from 'react';
import axios from 'axios';

export function useApi() {
  const api = useMemo(() => {
    const instance = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      }
    });

    // Интерсептор для обработки ошибок
    instance.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error);

        if (error.response) {
          // Сервер ответил с кодом ошибки
          console.error('Response data:', error.response.data);
          console.error('Response status:', error.response.status);
        } else if (error.request) {
          // Запрос был отправлен, но ответа не получено
          console.error('Network error - no response received');
        } else {
          // Ошибка при настройке запроса
          console.error('Request setup error:', error.message);
        }

        return Promise.reject(error);
      }
    );

    return instance;
  }, []);

  return { api };
}
