// src/contexts/SocketContext.js

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Автоматически подставляем протокол и хост
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.hostname;
    const port = process.env.REACT_APP_API_PORT || window.location.port || '3001';
    const socketUrl = `${protocol}://${host}:${port}`;

    const newSocket = io(socketUrl, {
      transports: ['websocket'],
      path: '/socket.io',
      autoConnect: true,
      timeout: 20000
    });

    newSocket.on('connect', () => {
      console.log('Socket подключен:', newSocket.id);
      setConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket отключен:', reason);
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Ошибка подключения Socket:', error);
      setConnected(false);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('Socket переподключен после', attemptNumber, 'попыток');
      setConnected(true);
    });

    setSocket(newSocket);

    return () => {
      newSocket.off();
      newSocket.close();
    };
  }, []);

  const joinChat = (chatId) => {
    if (socket && connected) {
      socket.emit('join_chat', chatId);
    }
  };

  const leaveChat = (chatId) => {
    if (socket && connected) {
      socket.emit('leave_chat', chatId);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, connected, joinChat, leaveChat }}>
      {children}
    </SocketContext.Provider>
  );
};
