// frontend/src/components/AMOWidget.js

import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, CircularProgress, TextField, Button, Divider } from '@mui/material';
import axios from 'axios';

export default function AMOWidget() {
  const [leadId, setLeadId] = useState(null);
  const [contact, setContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // 1. Получаем ID сделки/контакта из query или postMessage (режим виджета)
  useEffect(() => {
    function parseContext() {
      // AMO передает параметры как ?lead_id= или через window.parent.postMessage
      const params = new URLSearchParams(window.location.search);
      const amoLeadId = params.get('lead_id');
      if (amoLeadId) {
        setLeadId(amoLeadId);
        return;
      }
      // fallback для режима iframe/postMessage (если используете amoCRM postMessage API)
      window.addEventListener('message', (e) => {
        if (e.data && e.data.lead_id) {
          setLeadId(e.data.lead_id);
        }
      });
    }
    parseContext();
  }, []);

  // 2. Получаем информацию о контакте и переписку
  useEffect(() => {
    if (!leadId) return;
    setLoading(true);
    axios
      .get(`/api/amowidget/lead/${leadId}`) // endpoint должен отдавать { contact: {...}, messages: [...] }
      .then(res => {
        setContact(res.data.contact);
        setMessages(res.data.messages || []);
      })
      .finally(() => setLoading(false));
  }, [leadId]);

  // 3. Отправка сообщения
  const handleSend = () => {
    if (!msg || !contact?.phone) return;
    setSending(true);
    axios
      .post(`/api/messages/send`, {
        phoneNumber: contact.phone,
        message: msg,
        chatId: contact.chatId || null
      })
      .then(() => {
        setMessages(prev => [...prev, { from: 'me', text: msg, ts: new Date() }]);
        setMsg('');
      })
      .finally(() => setSending(false));
  };

  if (loading) return (
    <Box p={3} sx={{ minHeight: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress />
    </Box>
  );

  if (!contact)
    return (
      <Paper sx={{ p: 3 }}>
        <Typography color="error">Контакт не найден или не привязан к сделке.</Typography>
      </Paper>
    );

  return (
    <Paper sx={{ p: 2, minHeight: 350, width: '100%', background: '#fafbfc' }}>
      <Typography variant="h6" gutterBottom>
        Чат WhatsApp (deal #{leadId})
      </Typography>

      <Box sx={{ mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {contact.name} — <b>{contact.phone}</b>
        </Typography>
      </Box>

      <Divider sx={{ mb: 1 }} />

      <Box sx={{ height: 160, overflowY: 'auto', background: '#fff', borderRadius: 1, mb: 1, p: 1 }}>
        {messages.length === 0 && (
          <Typography color="text.disabled">Нет сообщений</Typography>
        )}
        {messages.map((m, i) => (
          <Box key={i} sx={{
            textAlign: m.from === 'me' ? 'right' : 'left',
            mb: 0.3,
            color: m.from === 'me' ? 'primary.main' : 'text.secondary',
            fontSize: '0.97em'
          }}>
            <span>{m.text}</span>
          </Box>
        ))}
      </Box>

      <Box
        component="form"
        onSubmit={e => { e.preventDefault(); handleSend(); }}
        sx={{ display: 'flex', gap: 1, alignItems: 'center' }}
      >
        <TextField
          size="small"
          fullWidth
          value={msg}
          onChange={e => setMsg(e.target.value)}
          placeholder="Ваше сообщение…"
          disabled={sending}
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          size="small"
          disabled={sending || !msg}
        >
          Отправить
        </Button>
      </Box>
    </Paper>
  );
}
