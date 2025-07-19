import React, { useState } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Badge,
  Typography,
  TextField,
  InputAdornment,
  Divider,
  CircularProgress,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Search as SearchIcon,
  Person as PersonIcon,
  Phone as PhoneIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

const ChatSidebar = ({ 
  contacts, 
  selectedChat, 
  onChatSelect, 
  loading, 
  isAMOWidget 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const theme = useTheme();
  const isMobileView = useMediaQuery(theme.breakpoints.down('md'));

  const filteredContacts = contacts.filter(contact => 
    contact.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.contactPhone?.includes(searchQuery) ||
    contact.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatLastMessageTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      return formatDistanceToNow(new Date(timestamp), { 
        addSuffix: true, 
        locale: ru 
      });
    } catch {
      return '';
    }
  };

  const truncateMessage = (message, maxLength = isAMOWidget ? 30 : 50) => {
    if (!message) return '';
    return message.length > maxLength 
      ? message.substring(0, maxLength) + '...' 
      : message;
  };

  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          height: '200px',
          width: '100%'
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      background: theme.palette.background.paper,
      minWidth: isAMOWidget ? '250px' : '300px'
    }}>
      {/* Заголовок и поиск */}
      <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Typography 
          variant={isAMOWidget ? "subtitle1" : "h6"} 
          gutterBottom
          sx={{ fontWeight: 600 }}
        >
          {isAMOWidget ? 'Чаты' : 'Чаты WhatsApp'}
        </Typography>
        
        <TextField
          fullWidth
          size="small"
          placeholder="Поиск чатов..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: isAMOWidget ? '8px' : '20px',
              fontSize: '0.9rem'
            }
          }}
        />
      </Box>

      {/* Список чатов */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {filteredContacts.length === 0 && !loading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <PersonIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">
              {searchQuery ? 'Чаты не найдены' : 'Нет активных чатов'}
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {filteredContacts.map((contact, index) => (
              <React.Fragment key={contact.id || index}>
                <ListItem disablePadding>
                  <ListItemButton
                    selected={selectedChat?.id === contact.id}
                    onClick={() => onChatSelect(contact)}
                    sx={{
                      py: isAMOWidget ? 1 : 1.5,
                      px: 2,
                      '&.Mui-selected': {
                        backgroundColor: theme.palette.action.selected,
                        borderRight: `3px solid ${theme.palette.primary.main}`
                      },
                      '&:hover': {
                        backgroundColor: theme.palette.action.hover,
                      }
                    }}
                  >
                    <ListItemAvatar>
                      <Badge
                        badgeContent={contact.unreadCount || 0}
                        color="error"
                        invisible={!contact.unreadCount}
                        sx={{
                          '& .MuiBadge-badge': {
                            fontSize: '0.75rem',
                            minWidth: '18px',
                            height: '18px'
                          }
                        }}
                      >
                        <Avatar 
                          sx={{ 
                            width: isAMOWidget ? 36 : 48, 
                            height: isAMOWidget ? 36 : 48,
                            backgroundColor: theme.palette.primary.light,
                            color: theme.palette.primary.contrastText
                          }}
                        >
                          {contact.contactName ? 
                            contact.contactName[0].toUpperCase() : 
                            <PhoneIcon fontSize="small" />
                          }
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>

                    <ListItemText
                      primary={
                        <Typography 
                          variant="subtitle2" 
                          sx={{ 
                            fontWeight: contact.unreadCount ? 600 : 400,
                            fontSize: isAMOWidget ? '0.85rem' : '0.9rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {contact.contactName || contact.contactPhone}
                        </Typography>
                      }
                      secondary={
                        <Box>
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'text.secondary',
                              fontSize: isAMOWidget ? '0.75rem' : '0.8rem',
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {truncateMessage(contact.lastMessage) || 'Нет сообщений'}
                          </Typography>
                          {contact.lastMessageTime && (
                            <Typography
                              variant="caption"
                              sx={{
                                color: 'text.disabled',
                                fontSize: '0.7rem',
                                mt: 0.2
                              }}
                            >
                              {formatLastMessageTime(contact.lastMessageTime)}
                            </Typography>
                          )}
                        </Box>
                      }
                      sx={{ 
                        m: 0,
                        '& .MuiListItemText-primary': { mb: 0.5 },
                        '& .MuiListItemText-secondary': { mt: 0 }
                      }}
                    />
                  </ListItemButton>
                </ListItem>
                
                {index < filteredContacts.length - 1 && (
                  <Divider variant="inset" component="li" />
                )}
              </React.Fragment>
            ))}
          </List>
        )}
      </Box>

      {/* Статус подключения (для обычного режима) */}
      {!isAMOWidget && (
        <Box sx={{ 
          p: 1, 
          borderTop: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.default
        }}>
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: theme.palette.success.main
              }}
            />
            Подключено к WhatsApp
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ChatSidebar;
