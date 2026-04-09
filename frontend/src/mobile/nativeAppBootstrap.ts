import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { PushNotifications } from '@capacitor/push-notifications';
import { customerAccountService } from '../services/customerAccountService';

const MOBILE_PUSH_ENABLED =
  String(
    import.meta.env.VITE_MOBILE_PUSH_ENABLED ||
      (Capacitor.isNativePlatform() ? 'true' : 'false')
  ).toLowerCase() === 'true';
const PUSH_PROMPTED_KEY = 'jnk_mobile_push_prompted';
const PUSH_TOKEN_KEY = 'jnk_mobile_push_token';
const PUSH_LAST_SYNC_TOKEN_KEY = 'jnk_mobile_push_last_sync_token';
const PUSH_GUEST_ID_KEY = 'jnk_mobile_push_guest_id';

const normalizeInternalUrl = (rawUrl: string): string | null => {
  try {
    const parsed = new URL(rawUrl);
    const host = String(parsed.host || '').toLowerCase();
    if (
      parsed.protocol === 'https:' &&
      (host === 'janocaminho.com.br' || host === 'www.janocaminho.com.br')
    ) {
      return `${parsed.pathname || '/'}${parsed.search || ''}${parsed.hash || ''}`;
    }
  } catch {
    // no-op
  }

  if (rawUrl.startsWith('janocaminho://')) {
    const value = rawUrl.replace('janocaminho://', '').trim();
    if (!value) return '/hub';
    const normalized = value.startsWith('/') ? value : `/${value}`;
    if (!/^\/[A-Za-z0-9/_?=&%#.-]*$/.test(normalized)) return null;
    return normalized;
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

const getOrCreateGuestPushId = () => {
  try {
    const existing = String(localStorage.getItem(PUSH_GUEST_ID_KEY) || '').trim();
    if (existing) return existing;
    const generated =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(PUSH_GUEST_ID_KEY, generated);
    return generated;
  } catch {
    return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
};

const syncPushTokenWithBackend = async (tokenRaw?: string | null) => {
  const token = String(tokenRaw || localStorage.getItem(PUSH_TOKEN_KEY) || '').trim();
  if (!token) return;
  const customerToken = getCustomerSessionToken();
  const guestId = getOrCreateGuestPushId();
  const mode = customerToken ? 'customer' : 'guest';
  const syncKey = `${mode}:${customerToken ? 'auth' : guestId}:${token}`;

  const lastSynced = String(localStorage.getItem(PUSH_LAST_SYNC_TOKEN_KEY) || '').trim();
  if (lastSynced === syncKey) return;

  try {
    if (customerToken) {
      await customerAccountService.registerPushToken({
        token,
        platform: Capacitor.getPlatform(),
      });
    } else {
      await customerAccountService.registerGuestPushToken({
        guestId,
        token,
        platform: Capacitor.getPlatform(),
      });
    }
    localStorage.setItem(PUSH_LAST_SYNC_TOKEN_KEY, syncKey);
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
        return;
      }
      // If user denied before, allow re-request to recover token registration.
      const requested = await PushNotifications.requestPermissions();
      if (requested.receive === 'granted') {
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
    window.setInterval(() => {
      void syncPushTokenWithBackend();
    }, 15000);
    window.addEventListener('storage', (event) => {
      if (event.key === 'customerSession') {
        void syncPushTokenWithBackend();
      }
    });
  }
};
