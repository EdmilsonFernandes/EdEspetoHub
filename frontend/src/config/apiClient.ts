import {
  forceLogoutAndRedirect,
  inferScopeFromPathname,
  isSessionAuthError,
  recoverCustomerSession,
} from '../utils/sessionRedirect';

const resolveBaseUrl = () =>
{
  return import.meta.env.VITE_API_BASE_URL || '/api';
};

const API_BASE_URL = resolveBaseUrl();

const defaultHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
};

const getLang = (): string => {
  const stored = localStorage.getItem('lang');
  if (stored) return stored;
  return navigator.language?.toLowerCase() || 'pt';
};

// 🔐 recupera token do adminSession
const getAdminToken = (): string | null =>
{
  try
  {
    const raw = localStorage.getItem('adminSession');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.token ?? null;
  } catch
  {
    return null;
  }
};

const getMotoboyToken = (): string | null => {
  try {
    const raw = localStorage.getItem('motoboySession');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.token ?? null;
  } catch {
    return null;
  }
};

const buildUrl = (path: string) =>
{
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

const handleResponse = async (
  response: Response,
  routeScope: 'customer' | 'admin' | 'motoboy' = 'admin',
  canAutoLogout = false,
  onAuthError?: () => void
) =>
{
  if (!response.ok)
  {
    const contentType = response.headers.get('content-type') || '';
    let payload: any = null;
    if (contentType.includes('application/json')) {
      payload = await response.json().catch(() => null);
    } else {
      const text = await response.text().catch(() => '');
      payload = text ? { message: text } : null;
    }
    const nestedError = payload?.error && typeof payload.error === 'object' ? payload.error : null;
    const message = payload?.message || nestedError?.message || response.statusText;
    const error: any = new Error(message);
    error.status = response.status;
    if (payload?.code || nestedError?.code) error.code = payload?.code || nestedError?.code;
    if (payload?.details || nestedError?.details) error.details = payload?.details || nestedError?.details;

    const messageToCheck = payload?.message || message || '';
    if (canAutoLogout && isSessionAuthError(response.status, messageToCheck, payload?.code || '')) {
      if (onAuthError) {
        onAuthError();
      }
      const inferredScope =
        typeof window !== 'undefined'
          ? inferScopeFromPathname(window.location.pathname)
          : routeScope;
      const targetScope =
        routeScope === 'customer'
          ? routeScope
          : inferredScope === 'superadmin'
            ? routeScope
            : inferredScope;
      if (!onAuthError || routeScope !== 'customer') {
        forceLogoutAndRedirect(targetScope);
      }
    }

    throw error;
  }
  return response.json();
};

const getCustomerToken = (): string | null => {
  try {
    const raw = localStorage.getItem('customerSession');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.token ?? null;
  } catch {
    return null;
  }
};

const getAdminRole = (): string =>
{
  try
  {
    const raw = localStorage.getItem('adminSession');
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    return String(parsed?.user?.role || '').toUpperCase();
  } catch
  {
    return '';
  }
};

const resolveAuthToken = (
  path: string,
  authMode: 'auto' | 'none' | 'admin' | 'customer' | 'motoboy' = 'auto'
) => {
  const isMotoboyRoute = path.startsWith('/motoboy') || path.startsWith('motoboy');
  const isCustomerRoute = path.startsWith('/customer') || path.startsWith('customer');

  const motoboyToken = getMotoboyToken();
  const adminToken = getAdminToken();
  const customerToken = getCustomerToken();

  if (authMode === 'none') return null;
  if (authMode === 'admin') return adminToken;
  if (authMode === 'customer') return customerToken;
  if (authMode === 'motoboy') return motoboyToken;

  let token = adminToken || customerToken;
  if (isMotoboyRoute) {
    token = motoboyToken;
  } else if (isCustomerRoute) {
    token = customerToken || adminToken;
  }

  return token;
};

const request = async (path: string, options: any = {}) =>
{
  const url = buildUrl(path);
  const isMotoboyRoute = path.startsWith('/motoboy') || path.startsWith('motoboy');
  const isCustomerRoute = path.startsWith('/customer') || path.startsWith('customer');
  const timeoutMs = Number(options?.timeoutMs || 0);
  const hasExternalSignal = Boolean(options?.signal);
  const controller =
    timeoutMs > 0 && typeof AbortController !== 'undefined' && !hasExternalSignal
      ? new AbortController()
      : null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  const motoboyToken = getMotoboyToken();
  const adminToken = getAdminToken();
  const customerToken = getCustomerToken();
  const authMode = String(options?.authMode || 'auto').trim().toLowerCase() as
    | 'auto'
    | 'none'
    | 'admin'
    | 'customer'
    | 'motoboy';
  const token = resolveAuthToken(path, authMode);

  const finalOptions: any = {
    ...options,
    ...(controller ? { signal: controller.signal } : {}),
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-Lang': getLang(),
    },
  };
  delete finalOptions.timeoutMs;
  delete finalOptions.authMode;

  if (finalOptions.body && typeof finalOptions.body === 'object')
  {
    finalOptions.body = JSON.stringify(finalOptions.body);
  }

  try {
    if (controller && timeoutMs > 0) {
      timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    }
    const response = await fetch(url, finalOptions);
    const adminRole = getAdminRole();
    const isOperator = adminRole === 'OPERATOR' || adminRole === 'LOJISTA';
    const hasPrivilegedSession = isMotoboyRoute ? Boolean(motoboyToken) : Boolean(adminToken);
    const canAutoLogout = hasPrivilegedSession && !(response.status === 403 && isOperator && !isMotoboyRoute);
    const isCustomerAuthPage =
      typeof window !== 'undefined' && String(window.location.pathname || '').toLowerCase().startsWith('/cliente');
    const routeScope = isMotoboyRoute ? 'motoboy' : isCustomerRoute ? 'customer' : 'admin';
    const customerAuthRecovery =
      isCustomerRoute && customerToken
        ? () => recoverCustomerSession({ redirect: isCustomerAuthPage })
        : undefined;
    return handleResponse(
      response,
      routeScope,
      isCustomerRoute ? Boolean(customerToken) : canAutoLogout,
      customerAuthRecovery
    );
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      const timeoutError: any = new Error('Tempo de conexão esgotado. Tentando reconectar...');
      timeoutError.status = 0;
      timeoutError.code = 'REQUEST_TIMEOUT';
      throw timeoutError;
    }
    if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('NetworkError'))) {
      const netError: any = new Error('Falha na conexão com o servidor. Verifique sua internet.');
      netError.status = 0;
      netError.code = 'NETWORK_ERROR';
      throw netError;
    }
    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

// RAW (para download/export etc)
const rawRequest = async (path: string, options: any = {}) =>
{
  const url = buildUrl(path);
  const authMode = String(options?.authMode || 'auto').trim().toLowerCase() as
    | 'auto'
    | 'none'
    | 'admin'
    | 'customer'
    | 'motoboy';
  const token = resolveAuthToken(path, authMode);

  const finalOptions: any = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-Lang': getLang(),
    },
  };
  delete finalOptions.authMode;

  if (finalOptions.body && typeof finalOptions.body === 'object')
  {
    finalOptions.body = JSON.stringify(finalOptions.body);
  }

  try {
    return await fetch(url, finalOptions);
  } catch (error: any) {
    if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('NetworkError'))) {
      const netError: any = new Error('Falha na conexão com o servidor. Verifique sua internet e tente novamente.');
      netError.status = 0;
      netError.code = 'NETWORK_ERROR';
      throw netError;
    }
    throw error;
  }
};

export const apiClient = {
  get: (path: string, options: any = {}) => request(path, { ...options }),
  post: (path: string, body: any, options: any = {}) => request(path, { method: 'POST', body, ...options }),
  put: (path: string, body: any, options: any = {}) => request(path, { method: 'PUT', body, ...options }),
  patch: (path: string, body: any, options: any = {}) => request(path, { method: 'PATCH', body, ...options }),
  delete: (path: string, options: any = {}) => request(path, { method: 'DELETE', ...options }),

  rawGet: (path: string, options: any = {}) => rawRequest(path, { method: 'GET', ...options }),
  rawPost: (path: string, body: any, options: any = {}) => rawRequest(path, { method: 'POST', body, ...options }),
  rawPut: (path: string, body: any, options: any = {}) => rawRequest(path, { method: 'PUT', body, ...options }),
  rawPatch: (path: string, body: any, options: any = {}) => rawRequest(path, { method: 'PATCH', body, ...options }),
  rawDelete: (path: string, options: any = {}) => rawRequest(path, { method: 'DELETE', ...options }),
};
