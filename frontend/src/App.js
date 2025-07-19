import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, useMediaQuery } from '@mui/material';
import { SocketProvider } from './contexts/SocketContext';
import { AuthProvider } from './contexts/AuthContext';
import ChatInterface from './components/ChatInterface';
import Login from './components/Login';
import Settings from './components/Settings';
import AMOWidget from './components/AMOWidget';
import './App.css';

// Тема Material-UI
const theme = createTheme({
  palette: {
    primary: {
      main: '#25d366',
    },
    secondary: {
      main: '#128c7e',
    },
    background: {
      default: '#f0f2f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: ['Roboto', 'Arial', 'sans-serif'].join(','),
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#f1f1f1',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#c1c1c1',
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#a8a8a8',
          },
        },
      },
    },
  },
});

function App() {
  const [isAMOWidget, setIsAMOWidget] = useState(false);
  const [amoData, setAmoData] = useState(null);
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    // Проверяем, работаем ли мы как виджет AMO CRM
    const checkAMOWidget = () => {
      const isInFrame = window.parent !== window;
      const isAMOReferrer = document.referrer.includes('amocrm');
      const hasAMOData = window.amoData;

      if (isInFrame && (isAMOReferrer || hasAMOData)) {
        setIsAMOWidget(true);
        if (hasAMOData) {
          setAmoData(window.amoData);
        }
      }
    };

    checkAMOWidget();

    // Слушаем сообщения от родительского окна AMO
    const handleMessage = (event) => {
      if (event.data.type === 'amo_data') {
        setAmoData(event.data.data);
        setIsAMOWidget(true);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Регистрируем Service Worker для PWA
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW зарегистрирован: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW регистрация не удалась: ', registrationError);
        });
    }
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <SocketProvider>
          <Router>
            <div className={`App ${isAMOWidget ? 'amo-widget' : ''} ${isMobile ? 'mobile' : 'desktop'}`}>
              <Routes>
                <Route 
                  path="/widget" 
                  element={<AMOWidget amoData={amoData} />} 
                />
                <Route 
                  path="/login" 
                  element={<Login />} 
                />
                <Route 
                  path="/settings" 
                  element={<Settings />} 
                />
                <Route 
                  path="/" 
                  element={
                    <ChatInterface 
                      isAMOWidget={isAMOWidget} 
                      amoData={amoData}
                      isMobile={isMobile}
                    />
                  } 
                />
              </Routes>
            </div>
          </Router>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
