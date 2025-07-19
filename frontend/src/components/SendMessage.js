import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  IconButton,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Send as SendIcon,
  Phone as PhoneIcon
} from '@mui/icons-material';

function SendMessage({ contact, onSendMessage }) {
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState(contact?.phone || '');
  const [sending, setSending] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });

  const showAlert = (message, severity = 'info') => {
    setAlert({ open: true, message, severity });
  };

  const handleSend = async () => {
    if (!phone.trim()) {
      showAlert('Введите номер телефона', 'error');
      return;
    }

    if (!message.trim()) {
      showAlert('Введите сообщение', 'error');
      return;
    }

    setSending(true);

    try {
      const result = await onSendMessage(phone, message);

      if (result.success) {
        setMessage('');
        showAlert('Сообщение отправлено!', 'success');
      } else {
        showAlert(result.error || 'Ошибка отправки', 'error');
      }
    } catch (error) {
      showAlert('Ошибка отправки сообщения', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  // Автоматически обновляем номер телефона при смене контакта
  React.useEffect(() => {
    if (contact) {
      setPhone(contact.phone);
    }
  }, [contact]);

  return (
    <Box>
      {/* Поле номера телефона (если нет выбранного контакта) */}
      {!contact && (
        <TextField
          fullWidth
          variant="outlined"
          label="Номер телефона"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+7 (900) 123-45-67"
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: <PhoneIcon sx={{ mr: 1, color: 'action.active' }} />
          }}
        />
      )}

      {/* Поле сообщения */}
      <Box display="flex" gap={1} alignItems="flex-end">
        <TextField
          fullWidth
          multiline
          minRows={1}
          maxRows={4}
          variant="outlined"
          label="Введите сообщение..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={sending}
          placeholder="Напишите сообщение..."
        />

        <IconButton
          color="primary"
          onClick={handleSend}
          disabled={sending || !message.trim() || !phone.trim()}
          sx={{
            backgroundColor: 'primary.main',
            color: 'white',
            '&:hover': {
              backgroundColor: 'primary.dark',
            },
            '&.Mui-disabled': {
              backgroundColor: 'grey.300',
              color: 'grey.500',
            }
          }}
        >
          <SendIcon />
        </IconButton>
      </Box>

      <Snackbar
        open={alert.open}
        autoHideDuration={4000}
        onClose={() => setAlert({ ...alert, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          severity={alert.severity} 
          onClose={() => setAlert({ ...alert, open: false })}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default SendMessage;
