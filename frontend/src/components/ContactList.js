import React from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Badge,
  Box,
  CircularProgress
} from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';

function ContactList({ contacts, selectedContact, onSelectContact, loading }) {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (contacts.length === 0) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <Typography color="text.secondary">
          Контакты не найдены
        </Typography>
      </Box>
    );
  }

  const formatLastMessage = (contact) => {
    if (contact.last_message_at) {
      const date = new Date(contact.last_message_at);
      const now = new Date();
      const diff = now - date;

      if (diff < 24 * 60 * 60 * 1000) {
        return date.toLocaleTimeString('ru-RU', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      } else {
        return date.toLocaleDateString('ru-RU');
      }
    }
    return '';
  };

  return (
    <List sx={{ height: 'calc(100% - 80px)', overflow: 'auto' }}>
      {contacts.map((contact) => (
        <ListItem
          key={contact.id}
          button
          selected={selectedContact?.id === contact.id}
          onClick={() => onSelectContact(contact)}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '&.Mui-selected': {
              backgroundColor: 'primary.light',
              '&:hover': {
                backgroundColor: 'primary.light',
              }
            }
          }}
        >
          <ListItemAvatar>
            <Avatar>
              <PersonIcon />
            </Avatar>
          </ListItemAvatar>

          <ListItemText
            primary={
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle1" noWrap>
                  {contact.name || contact.phone}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatLastMessage(contact)}
                </Typography>
              </Box>
            }
            secondary={
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary" noWrap>
                  {contact.phone}
                </Typography>
                {contact.message_count > 0 && (
                  <Badge 
                    badgeContent={contact.message_count} 
                    color="primary" 
                    max={999}
                  />
                )}
              </Box>
            }
          />
        </ListItem>
      ))}
    </List>
  );
}

export default ContactList;
