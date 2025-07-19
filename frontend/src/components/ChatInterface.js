import React, { useState, useEffect } from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import ChatSidebar from './ChatSidebar';
import ChatWindow from './ChatWindow';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { contactsAPI } from '../services/api';

const ChatInterface = ({ isAMOWidget, amoData, isMobile }) => {
  const [contacts, setContacts] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(!isMobile);

  const { socket, connected } = useSocket();
  const { isAuthenticated } = useAuth();
  const theme = useTheme();
  const isMobileView = useMediaQuery(theme.breakpoints.down('md'));

  // Загрузка контактов при монтировании
  useEffect(() => {
    if (isAuthenticated) {
      loadContacts();
    }
  }, [isAuthenticated]);

  // Обработка данных AMO CRM
  useEffect(() => {
    if (isAMOWidget && amoData) {
      // Если есть данные о сделке/контакте из AMO, автоматически выбираем чат
      const phoneNumber = extractPhoneFromAMOData(amoData);
      if (phoneNumber) {
        const existingChat = contacts.find(c => c.contactPhone === phoneNumber);
        if (existingChat) {
          setSelectedChat(existingChat);
        }
      }
    }
  }, [isAMOWidget, amoData, contacts]);

  // Socket.IO обработчики
  useEffect(() => {
    if (!socket || !connected) return;

    // Новое сообщение
    const handleNewMessage = (message) => {
      setMessages(prev => [...prev, message]);

      // Обновляем список чатов
      setContacts(prev => prev.map(chat => 
        chat.id === message.chatId 
          ? {
              ...chat,
              lastMessage: message.content,
              lastMessageTime: message.timestamp,
              unreadCount: chat.id === selectedChat?.id ? 0 : (chat.unreadCount || 0) + 1
            }
          : chat
      ));
    };

    // Обновление статуса сообщения
    const handleMessageStatusUpdate = ({ messageId, status }) => {
      setMessages(prev => prev.map(msg => 
        msg.gupshupId === messageId ? { ...msg, status } : msg
      ));
    };

    // Обновление чата
    const handleChatUpdate = (chatUpdate) => {
      setContacts(prev => {
        const existingIndex = prev.findIndex(c => c.id === chatUpdate.chatId);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            ...chatUpdate
          };
          return updated;
        } else {
          return [chatUpdate, ...prev];
        }
      });
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_status_updated', handleMessageStatusUpdate);
    socket.on('chat_updated', handleChatUpdate);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_status_updated', handleMessageStatusUpdate);
      socket.off('chat_updated', handleChatUpdate);
    };
  }, [socket, connected, selectedChat?.id]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const response = await contactsAPI.getContacts(100);
      setContacts(response.data.chats || []);
    } catch (error) {
      console.error('Ошибка загрузки контактов:', error);
    } finally {
      setLoading(false);
    }
  };

  const extractPhoneFromAMOData = (data) => {
    // Извлекаем номер телефона из данных AMO CRM
    if (data.lead?.contacts?.[0]?.custom_fields) {
      const phoneField = data.lead.contacts[0].custom_fields.find(
        field => field.code === 'PHONE'
      );
      return phoneField?.values?.[0]?.value;
    }
    return null;
  };

  const handleChatSelect = (chat) => {
    setSelectedChat(chat);

    // Присоединяемся к комнате чата
    if (socket && connected) {
      socket.emit('join_chat', chat.id);
    }

    // На мобильных устройствах скрываем боковую панель при выборе чата
    if (isMobileView) {
      setShowSidebar(false);
    }
  };

  const handleBackToChats = () => {
    setShowSidebar(true);
    setSelectedChat(null);
  };

  if (!isAuthenticated) {
    return null; // AuthProvider перенаправит на страницу логина
  }

  return (
    <Box 
      className="chat-container"
      sx={{ 
        height: '100vh',
        display: 'flex',
        flexDirection: isMobileView ? 'column' : 'row',
        overflow: 'hidden'
      }}
    >
      {/* Боковая панель с чатами */}
      <Box 
        className={`chat-sidebar ${!showSidebar && isMobileView ? 'hidden' : ''}`}
        sx={{
          width: isMobileView ? '100%' : 350,
          minWidth: isMobileView ? 'unset' : 300,
          display: (!showSidebar && isMobileView) ? 'none' : 'flex',
          flexDirection: 'column',
          borderRight: isMobileView ? 'none' : '1px solid #e0e0e0',
          height: isMobileView ? (selectedChat ? '0' : '100%') : '100%'
        }}
      >
        <ChatSidebar
          contacts={contacts}
          selectedChat={selectedChat}
          onChatSelect={handleChatSelect}
          loading={loading}
          onRefresh={loadContacts}
          isMobile={isMobileView}
          isAMOWidget={isAMOWidget}
        />
      </Box>

      {/* Основная область чата */}
      <Box 
        className={`chat-main ${!selectedChat && isMobileView ? 'hidden' : ''}`}
        sx={{
          flex: 1,
          display: !selectedChat && isMobileView ? 'none' : 'flex',
          flexDirection: 'column',
          height: '100%',
          backgroundColor: '#e5ddd5'
        }}
      >
        <ChatWindow
          chat={selectedChat}
          messages={messages}
          setMessages={setMessages}
          onBackClick={isMobileView ? handleBackToChats : null}
          isMobile={isMobileView}
          isAMOWidget={isAMOWidget}
          amoData={amoData}
        />
      </Box>
    </Box>
  );
};

export default ChatInterface;
