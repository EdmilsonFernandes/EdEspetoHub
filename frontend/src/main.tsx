// @ts-nocheck
import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';

registerSW({
  immediate: true,
  onRegisteredSW(_, registration) {
    if (!registration) return;
    window.setInterval(() => {
      void registration.update();
    }, 60 * 1000);
  },
});

if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
