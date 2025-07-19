import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert, AlertTitle } from '@mui/material';

// Создаем контекст для уведомлений
const NotificationContext = createContext();

// Типы уведомлений
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error', 
  WARNING: 'warning',
  INFO: 'info'
};

// Провайдер контекста уведомлений
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  // Функция для добавления нового уведомления
  const addNotification = useCallback((notification) => {
    const id = Date.now() + Math.random();
    const newNotification = {
      id,
      type: NOTIFICATION_TYPES.INFO,
      autoHideDuration: 4000,
      ...notification
    };

    setNotifications(prev => [...prev, newNotification]);
    
    // Автоматическое удаление уведомления
    if (newNotification.autoHideDuration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.autoHideDuration);
    }
  }, []);

  // Функция для удаления уведомления
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  // Функции-помощники для разных типов уведомлений
  const showSuccess = useCallback((message, options = {}) => {
    addNotification({
      type: NOTIFICATION_TYPES.SUCCESS,
      message,
      ...options
    });
  }, [addNotification]);

  const showError = useCallback((message, options = {}) => {
    addNotification({
      type: NOTIFICATION_TYPES.ERROR,
      message,
      autoHideDuration: 6000, // Ошибки показываем дольше
      ...options
    });
  }, [addNotification]);

  const showWarning = useCallback((message, options = {}) => {
    addNotification({
      type: NOTIFICATION_TYPES.WARNING,
      message,
      ...options
    });
  }, [addNotification]);

  const showInfo = useCallback((message, options = {}) => {
    addNotification({
      type: NOTIFICATION_TYPES.INFO,
      message,
      ...options
    });
  }, [addNotification]);

  // Очистка всех уведомлений
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const contextValue = {
    notifications,
    addNotification,
    removeNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clearAll
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      
      {/* Рендер уведомлений */}
      {notifications.map((notification, index) => (
        <Snackbar
          key={notification.id}
          open={true}
          autoHideDuration={notification.autoHideDuration}
          onClose={() => removeNotification(notification.id)}
          anchorOrigin={{ 
            vertical: 'bottom', 
            horizontal: 'center' 
          }}
          sx={{
            // Если несколько уведомлений, смещаем их
            bottom: index * 70 + 20
          }}
        >
          <Alert 
            onClose={() => removeNotification(notification.id)}
            severity={notification.type}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {notification.title && (
              <AlertTitle>{notification.title}</AlertTitle>
            )}
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </NotificationContext.Provider>
  );
};

// Hook для использования контекста уведомлений
export const useNotification = () => {
  const context = useContext(NotificationContext);
  
  if (!context) {
    throw new Error('useNotification должен использоваться внутри NotificationProvider');
  }
  
  return context;
};

export default NotificationContext;
