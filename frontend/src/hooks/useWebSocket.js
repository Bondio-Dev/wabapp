import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:3001';

    console.log('Подключение к WebSocket:', wsUrl);

    socketRef.current = io(wsUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('WebSocket подключен');
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('WebSocket отключен');
      setConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Ошибка подключения WebSocket:', error);
      setConnected(false);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log(`WebSocket переподключен (попытка ${attemptNumber})`);
      setConnected(true);
    });

    socket.on('reconnect_error', (error) => {
      console.error('Ошибка переподключения WebSocket:', error);
    });

    return () => {
      console.log('Закрытие WebSocket соединения');
      socket.disconnect();
    };
  }, []);

  return {
    socket: socketRef.current,
    connected
  };
}
