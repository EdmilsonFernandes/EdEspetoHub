type SessionScope = 'admin' | 'motoboy' | 'superadmin';

const MANUAL_LOGOUT_REDIRECT_KEY = 'auth:manual-logout-redirect';

const TOKEN_ERROR_REGEX = /token|jwt|unauthorized|n[aã]o autorizado|sess[aã]o expirada/i;

export const inferScopeFromPathname = (pathname: string): SessionScope => {
  const current = String(pathname || '').toLowerCase();
  if (current.startsWith('/motoboy')) return 'motoboy';
  if (current.startsWith('/superadmin')) return 'superadmin';
  return 'admin';
};

const getLoginPath = (scope: SessionScope) => {
  if (scope === 'motoboy') return '/motoboy/login';
  if (scope === 'superadmin') return '/superadmin';
  return '/admin';
};

const getManualLogoutStorageKey = (scope: SessionScope) => `${MANUAL_LOGOUT_REDIRECT_KEY}:${scope}`;

export const isSessionAuthError = (status?: number, message?: string, code?: string) => {
  if (status === 401) return true;
  const normalizedCode = String(code || '').toUpperCase();
  if ([ 'AUTH-001', 'AUTH-002', 'AUTH-007' ].includes(normalizedCode)) return true;
  const normalizedMessage = String(message || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (!normalizedMessage) return false;
  return TOKEN_ERROR_REGEX.test(normalizedMessage);
};

export const markManualLogoutRedirect = (scope: SessionScope, target = '/hub') => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(getManualLogoutStorageKey(scope), target);
};

export const consumeManualLogoutRedirect = (scope: SessionScope) => {
  if (typeof window === 'undefined') return '';
  const key = getManualLogoutStorageKey(scope);
  const target = String(window.sessionStorage.getItem(key) || '').trim();
  if (target) {
    window.sessionStorage.removeItem(key);
  }
  return target;
};

export const forceLogoutAndRedirect = (scope: SessionScope) => {
  if (typeof window === 'undefined') return;

  window.sessionStorage.removeItem(getManualLogoutStorageKey(scope));

  if (scope === 'admin') {
    localStorage.removeItem('adminSession');
  } else if (scope === 'motoboy') {
    localStorage.removeItem('motoboySession');
  } else {
    localStorage.removeItem('superAdminToken');
    localStorage.removeItem('superAdminUser');
  }

  const loginPath = getLoginPath(scope);
  const currentPath = String(window.location.pathname || '');
  if (currentPath !== loginPath) {
    window.location.replace(loginPath);
  }
};
