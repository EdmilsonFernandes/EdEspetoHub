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

type AdminSession = {
  token: string;
  user?: {
    id?: string;
    fullName?: string;
    name?: string;
    email?: string;
    role?: string;
  };
  store?: {
    id?: string;
    slug?: string;
    name?: string;
  };
};

type MotoboySession = {
  token: string;
  user?: {
    id?: string;
    fullName?: string;
    name?: string;
    email?: string;
    role?: string;
  };
  store?: any;
};

type BiometricRole = 'customer' | 'admin' | 'motoboy';

type StoredBiometricProfile = {
  role: BiometricRole;
  userId: string;
  displayName: string;
  email: string;
  enabledAt: string;
  lastLoginAt: string;
  storeId?: string;
  storeSlug?: string;
  storeName?: string;
};

type NativeBiometricBridge = {
  isBiometricAvailable?: () => boolean;
  hasCustomerProfile?: () => boolean;
  getCustomerProfile?: () => string;
  getCustomerSession?: () => string;
  saveCustomerProfile?: (profileJson: string, sessionJson: string) => boolean;
  clearCustomerProfile?: () => boolean;
  authenticateCustomer?: (requestId: string, reason: string) => void;
  hasAdminProfile?: () => boolean;
  getAdminProfile?: () => string;
  getAdminSession?: () => string;
  saveAdminProfile?: (profileJson: string, sessionJson: string) => boolean;
  clearAdminProfile?: () => boolean;
  authenticateAdmin?: (requestId: string, reason: string) => void;
  hasMotoboyProfile?: () => boolean;
  getMotoboyProfile?: () => string;
  getMotoboySession?: () => string;
  saveMotoboyProfile?: (profileJson: string, sessionJson: string) => boolean;
  clearMotoboyProfile?: () => boolean;
  authenticateMotoboy?: (requestId: string, reason: string) => void;
};

declare global {
  interface Window {
    JNCBiometrics?: NativeBiometricBridge;
  }
}

const hasWindowBridge = () =>
  typeof window !== 'undefined' &&
  typeof window.JNCBiometrics !== 'undefined' &&
  window.JNCBiometrics !== null;

const getBridge = (): NativeBiometricBridge | null => {
  if (typeof window === 'undefined') return null;
  if (hasWindowBridge()) return window.JNCBiometrics || null;
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return null;
  return window.JNCBiometrics || null;
};

const waitForBridge = async (timeoutMs = 2500, intervalMs = 120): Promise<NativeBiometricBridge | null> => {
  const immediate = getBridge();
  if (immediate) return immediate;

  const startedAt = Date.now();
  return new Promise((resolve) => {
    const timer = window.setInterval(() => {
      const bridge = getBridge();
      if (bridge) {
        window.clearInterval(timer);
        resolve(bridge);
        return;
      }
      if ((Date.now() - startedAt) >= timeoutMs) {
        window.clearInterval(timer);
        resolve(null);
      }
    }, intervalMs);
  });
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

const syncAdminSession = (session: AdminSession | null) => {
  if (typeof window === 'undefined') return;
  if (session?.token) {
    localStorage.setItem('adminSession', JSON.stringify(session));
    return;
  }
  localStorage.removeItem('adminSession');
};

const syncMotoboySession = (session: MotoboySession | null) => {
  if (typeof window === 'undefined') return;
  if (session?.token) {
    localStorage.setItem('motoboySession', JSON.stringify(session));
    return;
  }
  localStorage.removeItem('motoboySession');
};

const normalizeCustomerProfile = (session: CustomerSession): StoredBiometricProfile | null => {
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

const normalizeAdminProfile = (session: AdminSession): StoredBiometricProfile | null => {
  const userId = String(session?.user?.id || '').trim();
  const email = String(session?.user?.email || '').trim().toLowerCase();
  const displayName = String(session?.store?.name || session?.user?.fullName || session?.user?.name || '').trim();
  if (!session?.token || !userId || !email) return null;
  const now = new Date().toISOString();
  return {
    role: 'admin',
    userId,
    email,
    displayName: displayName || 'Lojista',
    enabledAt: now,
    lastLoginAt: now,
    storeId: String(session?.store?.id || '').trim() || undefined,
    storeSlug: String(session?.store?.slug || '').trim() || undefined,
    storeName: String(session?.store?.name || '').trim() || undefined,
  };
};

const normalizeMotoboyProfile = (session: MotoboySession): StoredBiometricProfile | null => {
  const userId = String(session?.user?.id || '').trim();
  const email = String(session?.user?.email || '').trim().toLowerCase();
  const displayName = String(session?.user?.fullName || session?.user?.name || '').trim();
  if (!session?.token || !userId || !email) return null;
  const now = new Date().toISOString();
  return {
    role: 'motoboy',
    userId,
    email,
    displayName: displayName || 'Entregador',
    enabledAt: now,
    lastLoginAt: now,
  };
};

const authenticateWithBridge = async (
  authenticate: ((requestId: string, reason: string) => void) | undefined,
  getSession: (() => string) | undefined,
  reason: string,
) => {
  if (!authenticate || !getSession) {
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
      authenticate(requestId, reason);
    } catch {
      window.clearTimeout(timer);
      window.removeEventListener(BIOMETRIC_RESULT_EVENT, onResult as EventListener);
      reject(new Error('Não foi possível iniciar a biometria.'));
    }
  });

  if (!result.success) {
    throw new Error(result.message || 'Biometria não confirmada.');
  }

  const session = parseJson<any>(getSession());
  if (!session?.token) {
    throw new Error('Não encontramos uma sessão biométrica salva.');
  }
  return session;
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

  hasStoredAdminProfile() {
    const bridge = getBridge();
    return Boolean(bridge?.hasAdminProfile?.());
  },

  hasStoredMotoboyProfile() {
    const bridge = getBridge();
    return Boolean(bridge?.hasMotoboyProfile?.());
  },

  getStoredCustomerProfile() {
    const bridge = getBridge();
    return parseJson<StoredBiometricProfile>(bridge?.getCustomerProfile?.() || '');
  },

  getStoredCustomerSession() {
    const bridge = getBridge();
    return parseJson<CustomerSession>(bridge?.getCustomerSession?.() || '');
  },

  getStoredAdminProfile() {
    const bridge = getBridge();
    return parseJson<StoredBiometricProfile>(bridge?.getAdminProfile?.() || '');
  },

  getStoredAdminSession() {
    const bridge = getBridge();
    return parseJson<AdminSession>(bridge?.getAdminSession?.() || '');
  },

  getStoredMotoboyProfile() {
    const bridge = getBridge();
    return parseJson<StoredBiometricProfile>(bridge?.getMotoboyProfile?.() || '');
  },

  getStoredMotoboySession() {
    const bridge = getBridge();
    return parseJson<MotoboySession>(bridge?.getMotoboySession?.() || '');
  },

  hasValidStoredCustomerEnrollment() {
    return Boolean(this.getStoredCustomerProfile()?.userId && this.getStoredCustomerSession()?.token);
  },

  hasValidStoredAdminEnrollment() {
    return Boolean(this.getStoredAdminProfile()?.userId && this.getStoredAdminSession()?.token);
  },

  hasValidStoredMotoboyEnrollment() {
    return Boolean(this.getStoredMotoboyProfile()?.userId && this.getStoredMotoboySession()?.token);
  },

  getCustomerDiagnostics() {
    return {
      supported: this.isSupported(),
      profile: this.getStoredCustomerProfile(),
      session: this.getStoredCustomerSession(),
      validEnrollment: this.hasValidStoredCustomerEnrollment(),
    };
  },

  shouldOfferEnrollment(session: CustomerSession) {
    if (!this.isSupported()) return false;
    const profile = normalizeCustomerProfile(session);
    if (!profile) return false;
    const saved = this.getStoredCustomerProfile();
    if (!saved) return true;
    return saved.userId !== profile.userId;
  },

  shouldOfferAdminEnrollment(session: AdminSession) {
    if (!this.isSupported()) return false;
    const profile = normalizeAdminProfile(session);
    if (!profile) return false;
    const saved = this.getStoredAdminProfile();
    if (!saved) return true;
    return saved.userId !== profile.userId || saved.storeId !== profile.storeId;
  },

  shouldOfferMotoboyEnrollment(session: MotoboySession) {
    if (!this.isSupported()) return false;
    const profile = normalizeMotoboyProfile(session);
    if (!profile) return false;
    const saved = this.getStoredMotoboyProfile();
    if (!saved) return true;
    return saved.userId !== profile.userId;
  },

  enableCustomer(session: CustomerSession) {
    const bridge = getBridge();
    const profile = normalizeCustomerProfile(session);
    if (!bridge?.saveCustomerProfile || !profile) return false;
    return Boolean(bridge.saveCustomerProfile(JSON.stringify(profile), JSON.stringify(session)));
  },

  enableAdmin(session: AdminSession) {
    const bridge = getBridge();
    const profile = normalizeAdminProfile(session);
    if (!bridge?.saveAdminProfile || !profile) return false;
    return Boolean(bridge.saveAdminProfile(JSON.stringify(profile), JSON.stringify(session)));
  },

  enableMotoboy(session: MotoboySession) {
    const bridge = getBridge();
    const profile = normalizeMotoboyProfile(session);
    if (!bridge?.saveMotoboyProfile || !profile) return false;
    return Boolean(bridge.saveMotoboyProfile(JSON.stringify(profile), JSON.stringify(session)));
  },

  disableCustomer() {
    const bridge = getBridge();
    return Boolean(bridge?.clearCustomerProfile?.());
  },

  disableAdmin() {
    const bridge = getBridge();
    return Boolean(bridge?.clearAdminProfile?.());
  },

  disableMotoboy() {
    const bridge = getBridge();
    return Boolean(bridge?.clearMotoboyProfile?.());
  },

  async loginCustomerWithBiometrics(reason = 'Confirme sua identidade para entrar') {
    const bridge = await waitForBridge();
    const session = await authenticateWithBridge(
      bridge?.authenticateCustomer ? ((requestId: string, promptReason: string) => bridge.authenticateCustomer?.(requestId, promptReason)) : undefined,
      bridge?.getCustomerSession ? (() => bridge.getCustomerSession?.() || '') : undefined,
      reason,
    );
    syncCustomerSession(session);
    return session as CustomerSession;
  },

  async loginAdminWithBiometrics(reason = 'Confirme sua identidade para acessar sua operação') {
    const bridge = await waitForBridge();
    const session = await authenticateWithBridge(
      bridge?.authenticateAdmin ? ((requestId: string, promptReason: string) => bridge.authenticateAdmin?.(requestId, promptReason)) : undefined,
      bridge?.getAdminSession ? (() => bridge.getAdminSession?.() || '') : undefined,
      reason,
    );
    syncAdminSession(session);
    return session as AdminSession;
  },

  async loginMotoboyWithBiometrics(reason = 'Confirme sua identidade para acessar suas entregas') {
    const bridge = await waitForBridge();
    const session = await authenticateWithBridge(
      bridge?.authenticateMotoboy ? ((requestId: string, promptReason: string) => bridge.authenticateMotoboy?.(requestId, promptReason)) : undefined,
      bridge?.getMotoboySession ? (() => bridge.getMotoboySession?.() || '') : undefined,
      reason,
    );
    syncMotoboySession(session);
    return session as MotoboySession;
  },

  syncCustomerSession,
  syncAdminSession,
  syncMotoboySession,
};
