import { Capacitor } from '@capacitor/core';

const BIOMETRIC_RESULT_EVENT = 'jnc:android-biometric-result';
const CUSTOMER_SESSION_EVENT = 'jnc:customer-session-updated';

type CustomerSession = {
  token: string;
  user?: {
    id?: string;
    fullName?: string;
    name?: string;
    email?: string;
  };
};

type StoredCustomerProfile = {
  role: 'customer';
  userId: string;
  displayName: string;
  email: string;
  enabledAt: string;
  lastLoginAt: string;
};

type NativeBiometricBridge = {
  isBiometricAvailable?: () => boolean;
  hasCustomerProfile?: () => boolean;
  getCustomerProfile?: () => string;
  getCustomerSession?: () => string;
  saveCustomerProfile?: (profileJson: string, sessionJson: string) => boolean;
  clearCustomerProfile?: () => boolean;
  authenticateCustomer?: (requestId: string, reason: string) => void;
};

declare global {
  interface Window {
    JNCBiometrics?: NativeBiometricBridge;
  }
}

const getBridge = (): NativeBiometricBridge | null => {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return null;
  if (typeof window === 'undefined') return null;
  return window.JNCBiometrics || null;
};

const parseJson = <T>(value?: string | null): T | null => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const syncCustomerSession = (session: CustomerSession | null) => {
  if (typeof window === 'undefined') return;
  if (session?.token) {
    localStorage.setItem('customerSession', JSON.stringify(session));
    window.dispatchEvent(new CustomEvent(CUSTOMER_SESSION_EVENT, { detail: session }));
    return;
  }
  localStorage.removeItem('customerSession');
  window.dispatchEvent(new CustomEvent(CUSTOMER_SESSION_EVENT));
};

const normalizeCustomerProfile = (session: CustomerSession): StoredCustomerProfile | null => {
  const userId = String(session?.user?.id || '').trim();
  const email = String(session?.user?.email || '').trim().toLowerCase();
  const displayName = String(session?.user?.fullName || session?.user?.name || '').trim();
  if (!session?.token || !userId || !email) return null;
  const now = new Date().toISOString();
  return {
    role: 'customer',
    userId,
    email,
    displayName: displayName || 'Cliente',
    enabledAt: now,
    lastLoginAt: now,
  };
};

export const nativeBiometricService = {
  isSupported() {
    const bridge = getBridge();
    return Boolean(bridge?.isBiometricAvailable?.());
  },

  hasStoredCustomerProfile() {
    const bridge = getBridge();
    return Boolean(bridge?.hasCustomerProfile?.());
  },

  getStoredCustomerProfile() {
    const bridge = getBridge();
    return parseJson<StoredCustomerProfile>(bridge?.getCustomerProfile?.() || '');
  },

  shouldOfferEnrollment(session: CustomerSession) {
    if (!this.isSupported()) return false;
    const profile = normalizeCustomerProfile(session);
    if (!profile) return false;
    const saved = this.getStoredCustomerProfile();
    if (!saved) return true;
    return saved.userId !== profile.userId;
  },

  enableCustomer(session: CustomerSession) {
    const bridge = getBridge();
    const profile = normalizeCustomerProfile(session);
    if (!bridge?.saveCustomerProfile || !profile) return false;
    return Boolean(bridge.saveCustomerProfile(JSON.stringify(profile), JSON.stringify(session)));
  },

  disableCustomer() {
    const bridge = getBridge();
    return Boolean(bridge?.clearCustomerProfile?.());
  },

  async loginCustomerWithBiometrics(reason = 'Confirme sua identidade para entrar'): Promise<CustomerSession> {
    const bridge = getBridge();
    if (!bridge?.authenticateCustomer || !bridge?.getCustomerSession) {
      throw new Error('Biometria não disponível neste aparelho.');
    }

    const requestId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `bio-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    const result = await new Promise<{ success: boolean; message?: string }>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        window.removeEventListener(BIOMETRIC_RESULT_EVENT, onResult as EventListener);
        reject(new Error('A autenticação biométrica expirou. Tente novamente.'));
      }, 45000);

      const onResult = (event: Event) => {
        const detail = (event as CustomEvent<any>)?.detail || {};
        if (String(detail?.requestId || '') !== requestId) return;
        window.clearTimeout(timer);
        window.removeEventListener(BIOMETRIC_RESULT_EVENT, onResult as EventListener);
        resolve({
          success: Boolean(detail?.success),
          message: String(detail?.message || '').trim(),
        });
      };

      window.addEventListener(BIOMETRIC_RESULT_EVENT, onResult as EventListener);

      try {
        bridge.authenticateCustomer?.(requestId, reason);
      } catch {
        window.clearTimeout(timer);
        window.removeEventListener(BIOMETRIC_RESULT_EVENT, onResult as EventListener);
        reject(new Error('Não foi possível iniciar a biometria.'));
      }
    });

    if (!result.success) {
      throw new Error(result.message || 'Biometria não confirmada.');
    }

    const session = parseJson<CustomerSession>(bridge.getCustomerSession());
    if (!session?.token) {
      throw new Error('Não encontramos uma sessão biométrica salva.');
    }

    syncCustomerSession(session);
    return session;
  },

  syncCustomerSession,
};

