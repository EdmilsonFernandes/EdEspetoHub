import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { PushNotifications } from '@capacitor/push-notifications';
import { customerAccountService } from '../services/customerAccountService';
import { ADMIN_SESSION_EVENT, CUSTOMER_SESSION_EVENT, MOTOBOY_SESSION_EVENT } from '../services/nativeBiometricService';
import { motoboyService } from '../services/motoboyService';
import { storePushService } from '../services/storePushService';

const MOBILE_PUSH_ENABLED =
  String(
    import.meta.env.VITE_MOBILE_PUSH_ENABLED ||
      (Capacitor.isNativePlatform() ? 'true' : 'false')
  ).toLowerCase() === 'true';
const PUSH_PROMPTED_KEY = 'jnk_mobile_push_prompted';
const PUSH_TOKEN_KEY = 'jnk_mobile_push_token';
const PUSH_LAST_SYNC_TOKEN_KEY = 'jnk_mobile_push_last_sync_token';
const PUSH_LAST_SYNC_STORE_TOKEN_KEY = 'jnk_mobile_push_last_sync_store_token';
const PUSH_LAST_SYNC_MOTOBOY_TOKEN_KEY = 'jnk_mobile_push_last_sync_motoboy_token';
const PUSH_GUEST_ID_KEY = 'jnk_mobile_push_guest_id';
const STORE_NEW_ORDER_PUSH_TYPE = 'store_new_online_order';
const STORE_NEW_ORDER_CHANNEL_ID = 'store_new_orders_v1';
const STORE_NEW_ORDER_CHANNEL_SOUND = 'jnc_store_new_order.wav';
const MOTOBOY_AVAILABLE_ORDER_PUSH_TYPE = 'motoboy_available_order';
const MOTOBOY_AVAILABLE_ORDER_EVENT = 'jnc:motoboy-available-order';
const MOTOBOY_QUEUE_BADGE_EVENT = 'jnc:motoboy-queue-badge';

let lastStoreForegroundAlertAt = 0;
let foregroundAudioContext: AudioContext | null = null;

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

  // Push/deep links no app podem chegar pelo esquema customizado em vez da URL web.
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

const isStoreNewOrderPush = (payload?: unknown) => {
  const data = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  return String(data.notificationType || data.pushType || '').trim() === STORE_NEW_ORDER_PUSH_TYPE;
};

const isMotoboyAvailableOrderPush = (payload?: unknown) => {
  const data = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  return String(data.notificationType || data.pushType || '').trim() === MOTOBOY_AVAILABLE_ORDER_PUSH_TYPE;
};

const ensureStoreOrderPushChannel = async () => {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;
  try {
    await PushNotifications.createChannel({
      id: STORE_NEW_ORDER_CHANNEL_ID,
      name: 'Novos pedidos',
      description: 'Alerta alto para novos pedidos online da sua loja',
      importance: 5,
      visibility: 1,
      vibration: true,
      sound: STORE_NEW_ORDER_CHANNEL_SOUND,
      lights: true,
      lightColor: '#1D4ED8',
    });
  } catch {
    // no-op
  }
};

const playStoreOrderForegroundAlert = async () => {
  if (typeof window === 'undefined') return;
  if (document.visibilityState !== 'visible') return;
  const now = Date.now();
  if ((now - lastStoreForegroundAlertAt) < 1200) return;
  lastStoreForegroundAlertAt = now;

  try {
    navigator.vibrate?.([180, 70, 260, 70, 320]);
  } catch {
    // no-op
  }

  try {
    const AudioContextCtor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    if (!foregroundAudioContext) {
      foregroundAudioContext = new AudioContextCtor();
    }
    if (foregroundAudioContext.state === 'suspended') {
      await foregroundAudioContext.resume();
    }

    const sequence = [
      { frequency: 784, duration: 0.11, gain: 0.04 },
      { frequency: 988, duration: 0.11, gain: 0.045 },
      { frequency: 1175, duration: 0.14, gain: 0.05 },
      { frequency: 1568, duration: 0.24, gain: 0.06 },
    ];
    let cursor = foregroundAudioContext.currentTime + 0.01;
    for (const step of sequence) {
      const oscillator = foregroundAudioContext.createOscillator();
      const gainNode = foregroundAudioContext.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(step.frequency, cursor);
      gainNode.gain.setValueAtTime(0.0001, cursor);
      gainNode.gain.exponentialRampToValueAtTime(step.gain, cursor + 0.015);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, cursor + step.duration);
      oscillator.connect(gainNode);
      gainNode.connect(foregroundAudioContext.destination);
      oscillator.start(cursor);
      oscillator.stop(cursor + step.duration + 0.04);
      cursor += step.duration + 0.045;
    }
  } catch {
    // no-op
  }
};

const triggerMotoboyForegroundOrderAlert = async (payload?: unknown) => {
  try {
    localStorage.setItem('motoboy:queue_badge', '1');
  } catch {
    // no-op
  }
  window.dispatchEvent(new CustomEvent(MOTOBOY_QUEUE_BADGE_EVENT, { detail: { active: true } }));
  window.dispatchEvent(new CustomEvent(MOTOBOY_AVAILABLE_ORDER_EVENT, { detail: payload || {} }));
  await playStoreOrderForegroundAlert();
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

const getAdminSessionContext = () => {
  try {
    const raw = localStorage.getItem('adminSession');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const token = String(parsed?.token || '').trim();
    const storeId = String(parsed?.store?.id || '').trim();
    const userId = String(parsed?.user?.id || '').trim();
    if (!token || !storeId || !userId) return null;
    return { token, storeId, userId };
  } catch {
    return null;
  }
};

const getMotoboySessionContext = () => {
  try {
    const raw = localStorage.getItem('motoboySession');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const token = String(parsed?.token || '').trim();
    const userId = String(parsed?.user?.id || '').trim();
    if (!token || !userId) return null;
    return { token, userId };
  } catch {
    return null;
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

const syncPushTokenNow = () => {
  void syncPushTokenWithBackend();
};

const syncPushTokenWithBackend = async (tokenRaw?: string | null) => {
  const token = String(tokenRaw || localStorage.getItem(PUSH_TOKEN_KEY) || '').trim();
  if (!token) return;

  const customerToken = getCustomerSessionToken();
  const guestId = getOrCreateGuestPushId();
  const syncKey = `${customerToken ? 'customer:auth' : `guest:${guestId}`}:${token}`;

  const lastSynced = String(localStorage.getItem(PUSH_LAST_SYNC_TOKEN_KEY) || '').trim();
  const syncTasks: Promise<unknown>[] = [];

  if (lastSynced !== syncKey) {
    syncTasks.push((async () => {
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
    })());
  }

  const adminSession = getAdminSessionContext();
  if (adminSession) {
    const storeSyncKey = `store:${adminSession.storeId}:${adminSession.userId}:${token}`;
    const lastStoreSync = String(localStorage.getItem(PUSH_LAST_SYNC_STORE_TOKEN_KEY) || '').trim();
    if (lastStoreSync !== storeSyncKey) {
      syncTasks.push((async () => {
        await storePushService.registerPushToken(adminSession.storeId, {
          token,
          platform: Capacitor.getPlatform(),
        });
        localStorage.setItem(PUSH_LAST_SYNC_STORE_TOKEN_KEY, storeSyncKey);
      })());
    }
  } else {
    localStorage.removeItem(PUSH_LAST_SYNC_STORE_TOKEN_KEY);
  }

  const motoboySession = getMotoboySessionContext();
  if (motoboySession) {
    const motoboySyncKey = `motoboy:${motoboySession.userId}:${token}`;
    const lastMotoboySync = String(localStorage.getItem(PUSH_LAST_SYNC_MOTOBOY_TOKEN_KEY) || '').trim();
    if (lastMotoboySync !== motoboySyncKey) {
      syncTasks.push((async () => {
        await motoboyService.registerPushToken({
          token,
          platform: Capacitor.getPlatform(),
        });
        localStorage.setItem(PUSH_LAST_SYNC_MOTOBOY_TOKEN_KEY, motoboySyncKey);
      })());
    }
  } else {
    localStorage.removeItem(PUSH_LAST_SYNC_MOTOBOY_TOKEN_KEY);
  }

  if (!syncTasks.length) return;

  const results = await Promise.allSettled(syncTasks);
  if (results.some((result) => result.status === 'rejected')) {
    // no-op
  }
};

const bootstrapPushNotifications = async () => {
  if (!MOBILE_PUSH_ENABLED) return;
  if (!Capacitor.isPluginAvailable('PushNotifications')) return;
  try {
    await ensureStoreOrderPushChannel();

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

    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      if (isStoreNewOrderPush(notification?.data)) {
        void playStoreOrderForegroundAlert();
        return;
      }
      if (isMotoboyAvailableOrderPush(notification?.data)) {
        void triggerMotoboyForegroundOrderAlert(notification?.data);
      }
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
      navigateFromPayload({ url });
    });
    await App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        if (MOBILE_PUSH_ENABLED) syncPushTokenNow();
        // O app usa esse evento para reidratar telas nativas sem forçar reload da WebView.
        window.dispatchEvent(new CustomEvent('jnc:app-foreground'));
      }
    });
  } catch {
    // no-op
  }

  await bootstrapPushNotifications();
  if (MOBILE_PUSH_ENABLED) {
    syncPushTokenNow();
    window.addEventListener('focus', syncPushTokenNow);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        // Em foreground, revalida o token sem interferir na navegação atual.
        syncPushTokenNow();
      }
    });
    window.addEventListener('storage', (event) => {
      if (event.key === 'customerSession' || event.key === 'adminSession' || event.key === 'motoboySession') {
        // Mantém o token sincronizado quando a sessão muda em outra aba/contexto.
        syncPushTokenNow();
      }
    });
    window.addEventListener(CUSTOMER_SESSION_EVENT, syncPushTokenNow as EventListener);
    window.addEventListener(ADMIN_SESSION_EVENT, syncPushTokenNow as EventListener);
    window.addEventListener(MOTOBOY_SESSION_EVENT, syncPushTokenNow as EventListener);
  }
};
