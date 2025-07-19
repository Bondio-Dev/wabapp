import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Grid, 
  Paper, 
  Typography, 
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Badge
} from '@mui/material';
import { 
  Phone as PhoneIcon,
  Message as MessageIcon,
  Refresh as RefreshIcon 
} from '@mui/icons-material';

import ContactList from './components/ContactList';
import MessageList from './components/MessageList';
import SendMessage from './components/SendMessage';
import { useWebSocket } from './hooks/useWebSocket';
import { useApi } from './hooks/useApi';

function App() {
  const [selectedContact, setSelectedContact] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const { socket, connected } = useWebSocket();
  const { api } = useApi();

  // Загрузка контактов при старте
  useEffect(() => {
    loadContacts();
  }, []);

  // Загрузка сообщений при выборе контакта
  useEffect(() => {
    if (selectedContact) {
      loadMessages(selectedContact.id);
    }
  }, [selectedContact]);

  // WebSocket обработчики
  useEffect(() => {
    if (socket) {
      socket.on('message_received', (data) => {
        console.log('Получено новое сообщение:', data);

        // Обновляем список сообщений если это активный чат
        if (selectedContact && selectedContact.id === data.contactId) {
          setMessages(prev => [...prev, {
            id: Date.now(),
            message_text: data.message,
            message_type: data.type,
            direction: 'incoming',
            created_at: new Date().toISOString()
          }]);
        }

        // Обновляем список контактов
        loadContacts();
      });

      socket.on('message_sent', (data) => {
        console.log('Сообщение отправлено:', data);

        // Обновляем список сообщений если это активный чат
        if (selectedContact && selectedContact.id === data.contactId) {
          loadMessages(selectedContact.id);
        }
      });

      return () => {
        socket.off('message_received');
        socket.off('message_sent');
      };
    }
  }, [socket, selectedContact]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/contacts');
      if (response.data.success) {
        setContacts(response.data.contacts);
      }
    } catch (error) {
      console.error('Ошибка загрузки контактов:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (contactId) => {
    try {
      const response = await api.get(`/api/messages/contact/${contactId}`);
      if (response.data.success) {
        setMessages(response.data.messages);
      }
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
    }
  };

  const handleSendMessage = async (phone, message) => {
    try {
      const response = await api.post('/api/messages/send', {
        phone,
        message
      });

      if (response.data.success) {
        // Сообщение отправлено, обновим список
        if (selectedContact) {
          loadMessages(selectedContact.id);
        }
        loadContacts();
        return { success: true };
      } else {
        return { success: false, error: response.data.error };
      }
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      return { success: false, error: error.message };
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Заголовок приложения */}
      <AppBar position="static">
        <Toolbar>
          <PhoneIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            WhatsApp Business API
          </Typography>

          <IconButton 
            color="inherit" 
            onClick={loadContacts}
            disabled={loading}
          >
            <RefreshIcon />
          </IconButton>

          <Badge 
            color="success" 
            variant="dot" 
            invisible={!connected}
          >
            <MessageIcon />
          </Badge>

          <Typography variant="body2" sx={{ ml: 1 }}>
            {connected ? 'Подключено' : 'Отключено'}
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 2 }}>
        <Grid container spacing={2}>
          {/* Список контактов */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ height: 'calc(100vh - 150px)', overflow: 'hidden' }}>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6">
                  Контакты ({contacts.length})
                </Typography>
              </Box>
              <ContactList 
                contacts={contacts}
                selectedContact={selectedContact}
                onSelectContact={setSelectedContact}
                loading={loading}
              />
            </Paper>
          </Grid>

          {/* Чат */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ height: 'calc(100vh - 150px)', display: 'flex', flexDirection: 'column' }}>
              {selectedContact ? (
                <>
                  {/* Заголовок чата */}
                  <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="h6">
                      {selectedContact.name || selectedContact.phone}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedContact.phone}
                    </Typography>
                  </Box>

                  {/* Список сообщений */}
                  <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                    <MessageList messages={messages} />
                  </Box>

                  {/* Форма отправки */}
                  <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                    <SendMessage 
                      contact={selectedContact}
                      onSendMessage={handleSendMessage}
                    />
                  </Box>
                </>
              ) : (
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  height: '100%' 
                }}>
                  <Typography variant="h6" color="text.secondary">
                    Выберите контакт для начала переписки
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

export default App;
