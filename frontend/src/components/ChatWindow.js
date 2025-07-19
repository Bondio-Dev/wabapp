import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Divider,
  Chip,
  CircularProgress,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Send as SendIcon,
  ArrowBack as ArrowBackIcon,
  AttachFile as AttachFileIcon,
  EmojiEmotions as EmojiIcon,
  Phone as PhoneIcon
} from '@mui/icons-material';
import { useSocket } from '../contexts/SocketContext';
import { messagesAPI } from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

const ChatWindow = ({ 
  selectedChat, 
  messages, 
  onBackToChats, 
  isMobile, 
  isAMOWidget 
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const messagesEndRef = useRef(null);
  
  const { socket, connected } = useSocket();
  const theme = useTheme();
  const isMobileView = useMediaQuery(theme.breakpoints.down('md'));

  // Загрузка сообщений для выбранного чата
  useEffect(() => {
    if (selectedChat) {
      loadChatMessages(selectedChat.id);
    }
  }, [selectedChat]);

  // Синхронизация с переданными сообщениями
  useEffect(() => {
    if (messages && Array.isArray(messages)) {
      setChatMessages(messages);
    }
  }, [messages]);

  // Автопрокрутка к последнему сообщению
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // Socket события
  useEffect(() => {
    if (!socket || !connected || !selectedChat) return;

    const handleTyping = ({ userId, isTyping }) => {
      if (isTyping) {
        setTypingUsers(prev => [...prev.filter(id => id !== userId), userId]);
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(id => id !== userId));
        }, 3000);
      } else {
        setTypingUsers(prev => prev.filter(id => id !== userId));
      }
    };

    socket.on('typing', handleTyping);
    socket.emit('join_chat', selectedChat.id);

    return () => {
      socket.off('typing', handleTyping);
      socket.emit('leave_chat', selectedChat.id);
    };
  }, [socket, connected, selectedChat]);

  const loadChatMessages = async (chatId) => {
    try {
      const response = await messagesAPI.getChatMessages(chatId);
      setChatMessages(response.data.messages || []);
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || sending) return;

    setSending(true);
    try {
      const messageData = {
        chatId: selectedChat.id,
        phoneNumber: selectedChat.contactPhone,
        message: newMessage.trim(),
        type: 'text'
      };

      await messagesAPI.sendMessage(messageData);
      setNewMessage('');
      
      // Socket отправит обновление, которое обновит список сообщений
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
    } finally {
      setSending(false);
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    
    // Уведомляем о печати
    if (socket && connected && selectedChat) {
      socket.emit('typing', { 
        chatId: selectedChat.id, 
        isTyping: e.target.value.length > 0 
      });
    }
  };

  const getMessageStatus = (message) => {
    switch (message.status) {
      case 'sent': return '✓';
      case 'delivered': return '✓✓';
      case 'read': return '✓✓';
      default: return '⏳';
    }
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!selectedChat) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          height: '100%',
          background: isAMOWidget ? '#f8f9fa' : theme.palette.background.default
        }}
      >
        <Typography variant="h6" color="text.secondary">
          {isAMOWidget ? 'Выберите чат для начала общения' : 'Выберите чат'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      background: isAMOWidget ? '#ffffff' : theme.palette.background.paper
    }}>
      {/* Заголовок чата */}
      <Paper 
        elevation={isAMOWidget ? 1 : 2} 
        sx={{ 
          p: 2, 
          borderRadius: isAMOWidget ? 1 : 0,
          background: isAMOWidget ? '#f8f9fa' : theme.palette.primary.main,
          color: isAMOWidget ? 'text.primary' : 'white'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {(isMobileView || isAMOWidget) && (
            <IconButton 
              onClick={onBackToChats} 
              size="small"
              sx={{ color: isAMOWidget ? 'text.primary' : 'white' }}
            >
              <ArrowBackIcon />
            </IconButton>
          )}
          
          <Avatar sx={{ width: 40, height: 40 }}>
            {selectedChat.contactName?.[0] || <PhoneIcon />}
          </Avatar>
          
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" sx={{ fontSize: isAMOWidget ? '0.9rem' : '1.1rem' }}>
              {selectedChat.contactName || selectedChat.contactPhone}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              {selectedChat.contactPhone}
              {connected && typingUsers.length > 0 && (
                <span> • печатает...</span>
              )}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Область сообщений */}
      <Box sx={{ 
        flexGrow: 1, 
        overflow: 'hidden', 
        display: 'flex', 
        flexDirection: 'column' 
      }}>
        <List sx={{ 
          flexGrow: 1, 
          overflow: 'auto', 
          p: 1,
          maxHeight: isAMOWidget ? '300px' : 'calc(100vh - 200px)'
        }}>
          {chatMessages.map((message, index) => (
            <ListItem
              key={message.id || index}
              sx={{
                justifyContent: message.direction === 'outgoing' ? 'flex-end' : 'flex-start',
                px: 1,
                py: 0.5
              }}
            >
              <Paper
                elevation={1}
                sx={{
                  p: 1.5,
                  maxWidth: '70%',
                  backgroundColor: message.direction === 'outgoing' 
                    ? theme.palette.primary.light 
                    : theme.palette.grey[100],
                  color: message.direction === 'outgoing' ? 'white' : 'text.primary',
                  borderRadius: '12px',
                  borderTopRightRadius: message.direction === 'outgoing' ? '4px' : '12px',
                  borderTopLeftRadius: message.direction === 'incoming' ? '4px' : '12px'
                }}
              >
                <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                  {message.content || message.text}
                </Typography>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  mt: 0.5 
                }}>
                  <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.7rem' }}>
                    {formatMessageTime(message.timestamp)}
                  </Typography>
                  {message.direction === 'outgoing' && (
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        opacity: 0.7, 
                        fontSize: '0.7rem',
                        color: message.status === 'read' ? '#34b7f1' : 'inherit'
                      }}
                    >
                      {getMessageStatus(message)}
                    </Typography>
                  )}
                </Box>
              </Paper>
            </ListItem>
          ))}
          <div ref={messagesEndRef} />
        </List>
      </Box>

      <Divider />

      {/* Поле ввода сообщения */}
      <Box 
        component="form" 
        onSubmit={handleSendMessage}
        sx={{ 
          p: 2, 
          display: 'flex', 
          gap: 1, 
          alignItems: 'flex-end',
          background: isAMOWidget ? '#f8f9fa' : 'background.paper'
        }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={4}
          value={newMessage}
          onChange={handleInputChange}
          placeholder="Введите сообщение..."
          variant="outlined"
          size="small"
          disabled={sending || !connected}
          sx={{ 
            '& .MuiOutlinedInput-root': {
              borderRadius: '20px',
              fontSize: isAMOWidget ? '0.85rem' : '0.9rem'
            }
          }}
        />
        
        <IconButton
          type="submit"
          color="primary"
          disabled={!newMessage.trim() || sending || !connected}
          sx={{ 
            p: 1.5,
            backgroundColor: theme.palette.primary.main,
            color: 'white',
            '&:hover': {
              backgroundColor: theme.palette.primary.dark,
            },
            '&:disabled': {
              backgroundColor: theme.palette.grey[400],
            }
          }}
        >
          {sending ? <CircularProgress size={20} /> : <SendIcon />}
        </IconButton>
      </Box>
    </Box>
  );
};

export default ChatWindow;
