import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { PushNotifications } from '@capacitor/push-notifications';

const PUSH_PROMPTED_KEY = 'jnk_mobile_push_prompted';
const PUSH_TOKEN_KEY = 'jnk_mobile_push_token';

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

const bootstrapPushNotifications = async () => {
  try {
    await PushNotifications.addListener('registration', (token) => {
      try {
        localStorage.setItem(PUSH_TOKEN_KEY, String(token?.value || ''));
      } catch {
        // no-op
      }
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
};

