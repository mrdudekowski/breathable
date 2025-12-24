import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { useTelegramWebApp } from './hooks/useTelegramWebApp';
import App from './App';
import './index.css';

const TelegramInitializer = () => {
  useTelegramWebApp();
  return null;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TelegramInitializer />
    <App />
  </StrictMode>
);
