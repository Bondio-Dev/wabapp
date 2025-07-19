import React, { useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar
} from '@mui/material';
import {
  Person as PersonIcon,
  SmartToy as BotIcon
} from '@mui/icons-material';

function MessageList({ messages }) {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!messages || messages.length === 0) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        height="100%"
      >
        <Typography color="text.secondary">
          Сообщений пока нет
        </Typography>
      </Box>
    );
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <Box sx={{ 
      height: '100%', 
      overflow: 'auto', 
      p: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 1
    }}>
      {messages.map((message, index) => {
        const isIncoming = message.direction === 'incoming';

        return (
          <Box
            key={message.id || index}
            display="flex"
            justifyContent={isIncoming ? 'flex-start' : 'flex-end'}
            alignItems="flex-start"
            gap={1}
          >
            {isIncoming && (
              <Avatar sx={{ width: 32, height: 32 }}>
                <PersonIcon />
              </Avatar>
            )}

            <Paper
              sx={{
                p: 1.5,
                maxWidth: '70%',
                backgroundColor: isIncoming ? 'grey.100' : 'primary.main',
                color: isIncoming ? 'text.primary' : 'primary.contrastText'
              }}
            >
              <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>
                {message.message_text}
              </Typography>

              <Typography 
                variant="caption" 
                sx={{ 
                  mt: 0.5,
                  display: 'block',
                  textAlign: 'right',
                  opacity: 0.7
                }}
              >
                {formatTime(message.created_at)}
              </Typography>
            </Paper>

            {!isIncoming && (
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                <BotIcon />
              </Avatar>
            )}
          </Box>
        );
      })}
      <div ref={messagesEndRef} />
    </Box>
  );
}

export default MessageList;
