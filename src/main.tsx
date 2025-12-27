import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { useTelegramWebApp } from './hooks/useTelegramWebApp';
import App from './App';
import './index.css';

const TelegramInitializer = () => {
  useTelegramWebApp();
  return null;
};

// Экспортируем для Fast Refresh
export { TelegramInitializer };

// Блокировка контекстного меню для предотвращения копирования изображений
document.addEventListener('contextmenu', e => {
  e.preventDefault();
  return false;
});

// Дополнительная защита: блокировка перетаскивания изображений
document.addEventListener('dragstart', e => {
  if (e.target instanceof HTMLImageElement || e.target instanceof SVGElement) {
    e.preventDefault();
    return false;
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TelegramInitializer />
    <App />
  </StrictMode>
);
