// Deploy validation trigger v3 - 2026-05-04 21:22
// @ts-nocheck
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { bootstrapNativeApp, scheduleNativeAppReadySignal } from './mobile/nativeAppBootstrap';
import { installStaleBuildRecovery } from './utils/staleBuildRecovery';

const isNativePlatform = Capacitor.isNativePlatform();
const SERVICE_WORKER_UPDATE_INTERVAL_MS = 15 * 60 * 1000;

installStaleBuildRecovery();

const unregisterServiceWorkersOnNative = async () => {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map(async (registration) => {
        try {
          await registration.unregister();
        } catch {
          // no-op
        }
      })
    );
  } catch {
    // no-op
  }
};

if (!isNativePlatform) {
  registerSW({
    immediate: true,
    onRegisteredSW(_, registration) {
      if (!registration) return;
      window.setInterval(() => {
        void registration.update();
      }, SERVICE_WORKER_UPDATE_INTERVAL_MS);
    },
  });
}

if (isNativePlatform) {
  void unregisterServiceWorkersOnNative();
}

void bootstrapNativeApp();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);

scheduleNativeAppReadySignal();
