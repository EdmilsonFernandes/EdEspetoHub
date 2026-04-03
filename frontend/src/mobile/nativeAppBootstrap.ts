import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { PushNotifications } from '@capacitor/push-notifications';
import { customerAccountService } from '../services/customerAccountService';

const MOBILE_PUSH_ENABLED = String(import.meta.env.VITE_MOBILE_PUSH_ENABLED || 'false').toLowerCase() === 'true';
const PUSH_PROMPTED_KEY = 'jnk_mobile_push_prompted';
const PUSH_TOKEN_KEY = 'jnk_mobile_push_token';
const PUSH_LAST_SYNC_TOKEN_KEY = 'jnk_mobile_push_last_sync_token';

const normalizeInternalUrl = (rawUrl: string): string | null => {
  try {
    const parsed = new URL(rawUrl);
    const host = String(parsed.host || '').toLowerCase();
    if (host === 'janocaminho.com.br' || host.endsWith('.janocaminho.com.br')) {
      return `${parsed.pathname || '/'}${parsed.search || ''}${parsed.hash || ''}`;
    }
  } catch {
    // no-op
  }

  if (rawUrl.startsWith('janocaminho://')) {
    const value = rawUrl.replace('janocaminho://', '').trim();
    if (!value) return '/hub';
    return value.startsWith('/') ? value : `/${value}`;
  }
  return null;
};

const navigateFromPayload = (payload?: unknown) => {
  const data = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  const candidates = [data.url, data.path, data.route]
    .map((value) => String(value || '').trim())
    .filter(Boolean);
  const target = candidates.find(Boolean);
  if (!target) return;
  const internal = normalizeInternalUrl(target);
  if (!internal) return;
  if (window.location.pathname + window.location.search + window.location.hash === internal) return;
  window.location.assign(internal);
};

const getCustomerSessionToken = () => {
  try {
    const raw = localStorage.getItem('customerSession');
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    return String(parsed?.token || '').trim();
  } catch {
    return '';
  }
};

const syncPushTokenWithBackend = async (tokenRaw?: string | null) => {
  const token = String(tokenRaw || localStorage.getItem(PUSH_TOKEN_KEY) || '').trim();
  if (!token) return;
  const customerToken = getCustomerSessionToken();
  if (!customerToken) return;

  const lastSynced = String(localStorage.getItem(PUSH_LAST_SYNC_TOKEN_KEY) || '').trim();
  if (lastSynced === token) return;

  try {
    await customerAccountService.registerPushToken({
      token,
      platform: Capacitor.getPlatform(),
    });
    localStorage.setItem(PUSH_LAST_SYNC_TOKEN_KEY, token);
  } catch {
    // no-op
  }
};

const bootstrapPushNotifications = async () => {
  if (!MOBILE_PUSH_ENABLED) return;
  if (!Capacitor.isPluginAvailable('PushNotifications')) return;
  try {
    await PushNotifications.addListener('registration', (token) => {
      const value = String(token?.value || '').trim();
      try {
        localStorage.setItem(PUSH_TOKEN_KEY, value);
      } catch {
        // no-op
      }
      void syncPushTokenWithBackend(value);
    });

    await PushNotifications.addListener('registrationError', () => {
      // no-op
    });

    await PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
      navigateFromPayload(event?.notification?.data);
    });

    await PushNotifications.addListener('pushNotificationReceived', () => {
      // no-op
    });

    const promptAlreadyDone =
      typeof localStorage !== 'undefined' && localStorage.getItem(PUSH_PROMPTED_KEY) === 'true';
    if (promptAlreadyDone) {
      const permissions = await PushNotifications.checkPermissions();
      if (permissions.receive === 'granted') {
        await PushNotifications.register();
      }
      return;
    }

    const permissions = await PushNotifications.checkPermissions();
    if (permissions.receive === 'granted') {
      await PushNotifications.register();
      localStorage.setItem(PUSH_PROMPTED_KEY, 'true');
      return;
    }

    const requested = await PushNotifications.requestPermissions();
    localStorage.setItem(PUSH_PROMPTED_KEY, 'true');
    if (requested.receive === 'granted') {
      await PushNotifications.register();
    }
  } catch {
    // no-op
  }
};

export const bootstrapNativeApp = async () => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await App.addListener('appUrlOpen', ({ url }) => {
      const target = normalizeInternalUrl(String(url || ''));
      if (!target) return;
      window.location.assign(target);
    });
  } catch {
    // no-op
  }

  await bootstrapPushNotifications();
  if (MOBILE_PUSH_ENABLED) {
    void syncPushTokenWithBackend();
    window.addEventListener('focus', () => {
      void syncPushTokenWithBackend();
    });
  }
};
