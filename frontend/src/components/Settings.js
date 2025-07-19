// src/components/Settings.js

import React, { useState, useEffect } from 'react';
import { TextField, Button, Box, Typography, Paper, Tabs, Tab } from '@mui/material';
import axios from 'axios';
import { useNotification } from '../contexts/NotificationContext';

function Settings() {
  const [activeTab, setActiveTab] = useState(0);
  const [settings, setSettings] = useState({
    // AMO CRM
    amoSubdomain: '',
    amoClientId: '',
    amoClientSecret: '',
    amoAccessToken: '',
    amoRefreshToken: '',
    amoPipelineId: '',
    amoStatusId: '',

    // Gupshup
    gupshupAppName: '',
    gupshupApiKey: '',
    gupshupSourceNumber: '',
    gupshupWebhookUrl: 'http://83.166.238.230/webhook/gupshup',

    // UI
    theme: 'light'
  });

  const { showSuccess, showError } = useNotification();

  // Загрузка настроек при монтировании
  useEffect(() => {
    axios.get('/api/settings')
      .then(response => {
        setSettings(response.data);
      })
      .catch(error => {
        showError('Ошибка загрузки настроек');
      });
  }, [showError]);

  // Сохранение настроек
  const handleSave = () => {
    axios.post('/api/settings', settings)
      .then(() => {
        showSuccess('Настройки сохранены');
      })
      .catch(error => {
        showError('Ошибка сохранения настроек');
      });
  };

  // Обработка ввода
  const handleChange = (key) => (e) => {
    setSettings({ ...settings, [key]: e.target.value });
  };

  return (
    <Paper elevation={3} sx={{ padding: 3 }}>
      <Typography variant="h5" gutterBottom>Настройки интеграции</Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}>
          <Tab label="AMO CRM" />
          <Tab label="Gupshup" />
          <Tab label="Интерфейс" />
        </Tabs>
      </Box>

      <Box sx={{ mt: 2 }}>
        {activeTab === 0 && (
          <Box display="grid" gap={2}>
            <TextField
              label="Поддомен AMO CRM"
              value={settings.amoSubdomain}
              onChange={handleChange('amoSubdomain')}
              fullWidth
            />
            <TextField
              label="Client ID"
              value={settings.amoClientId}
              onChange={handleChange('amoClientId')}
              fullWidth
            />
            <TextField
              label="Client Secret"
              value={settings.amoClientSecret}
              onChange={handleChange('amoClientSecret')}
              fullWidth
              type="password"
            />
            <TextField
              label="Access Token"
              value={settings.amoAccessToken}
              onChange={handleChange('amoAccessToken')}
              fullWidth
            />
            <TextField
              label="Refresh Token"
              value={settings.amoRefreshToken}
              onChange={handleChange('amoRefreshToken')}
              fullWidth
            />
            <TextField
              label="ID воронки"
              value={settings.amoPipelineId}
              onChange={handleChange('amoPipelineId')}
              fullWidth
            />
            <TextField
              label="ID этапа"
              value={settings.amoStatusId}
              onChange={handleChange('amoStatusId')}
              fullWidth
            />
          </Box>
        )}

        {activeTab === 1 && (
          <Box display="grid" gap={2}>
            <TextField
              label="Gupshup App Name"
              value={settings.gupshupAppName}
              onChange={handleChange('gupshupAppName')}
              fullWidth
            />
            <TextField
              label="Gupshup API Key"
              value={settings.gupshupApiKey}
              onChange={handleChange('gupshupApiKey')}
              fullWidth
            />
            <TextField
              label="Gupshup номер отправителя"
              value={settings.gupshupSourceNumber}
              onChange={handleChange('gupshupSourceNumber')}
              fullWidth
            />
            <TextField
              label="Webhook URL"
              value={settings.gupshupWebhookUrl}
              onChange={handleChange('gupshupWebhookUrl')}
              fullWidth
              disabled
            />
          </Box>
        )}

        {activeTab === 2 && (
          <Box display="grid" gap={2}>
            <TextField
              label="Тема оформления"
              value={settings.theme}
              onChange={handleChange('theme')}
              select
              SelectProps={{
                native: true
              }}
              fullWidth
            >
              <option value="light">Светлая</option>
              <option value="dark">Тёмная</option>
            </TextField>
          </Box>
        )}
      </Box>

      <Box sx={{ mt: 3 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          fullWidth
        >
          Сохранить
        </Button>
      </Box>
    </Paper>
  );
}

export default Settings;
