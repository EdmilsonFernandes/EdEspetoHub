<<<<<<< HEAD
=======
import { forceLogoutAndRedirect, inferScopeFromPathname, isSessionAuthError } from '../utils/sessionRedirect';

>>>>>>> main
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
<<<<<<< HEAD
const getToken = (): string | null =>
=======
const getAdminToken = (): string | null =>
>>>>>>> main
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

<<<<<<< HEAD
=======
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

>>>>>>> main
const buildUrl = (path: string) =>
{
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

<<<<<<< HEAD
const handleResponse = async (response: Response) =>
=======
const handleResponse = async (
  response: Response,
  routeScope: 'admin' | 'motoboy' = 'admin',
  canAutoLogout = false
) =>
>>>>>>> main
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
    const message = payload?.message || response.statusText;
    const error: any = new Error(message);
    error.status = response.status;
    if (payload?.code) error.code = payload.code;
    if (payload?.details) error.details = payload.details;
<<<<<<< HEAD
=======

    const messageToCheck = payload?.message || message || '';
    if (canAutoLogout && isSessionAuthError(response.status, messageToCheck, payload?.code || '')) {
      const inferredScope =
        typeof window !== 'undefined'
          ? inferScopeFromPathname(window.location.pathname)
          : routeScope;
      const targetScope = inferredScope === 'superadmin' ? routeScope : inferredScope;
      forceLogoutAndRedirect(targetScope);
    }

>>>>>>> main
    throw error;
  }
  return response.json();
};

<<<<<<< HEAD
const request = async (path: string, options: any = {}) =>
{
  const url = buildUrl(path);
  const token = getToken();
=======
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

const request = async (path: string, options: any = {}) =>
{
  const url = buildUrl(path);
  const isMotoboyRoute = path.startsWith('/motoboy') || path.startsWith('motoboy');
  const token = isMotoboyRoute ? getMotoboyToken() : getAdminToken();
>>>>>>> main

  const finalOptions: any = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-Lang': getLang(),
    },
  };

  if (finalOptions.body && typeof finalOptions.body === 'object')
  {
    finalOptions.body = JSON.stringify(finalOptions.body);
  }

  const response = await fetch(url, finalOptions);
<<<<<<< HEAD
  return handleResponse(response); // ⬅️ NÃO mascarar erro
=======
  const adminRole = getAdminRole();
  const isOperator = adminRole === 'OPERATOR' || adminRole === 'CHURRASQUEIRO';
  const canAutoLogout = Boolean(token) && !(response.status === 403 && isOperator && !isMotoboyRoute);
  return handleResponse(response, isMotoboyRoute ? 'motoboy' : 'admin', canAutoLogout); // ⬅️ NÃO mascarar erro
>>>>>>> main
};

// RAW (para download/export etc)
const rawRequest = async (path: string, options: any = {}) =>
{
  const url = buildUrl(path);
<<<<<<< HEAD
  const token = getToken();
=======
  const isMotoboyRoute = path.startsWith('/motoboy') || path.startsWith('motoboy');
  const token = isMotoboyRoute ? getMotoboyToken() : getAdminToken();
>>>>>>> main

  const finalOptions: any = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-Lang': getLang(),
    },
  };

  if (finalOptions.body && typeof finalOptions.body === 'object')
  {
    finalOptions.body = JSON.stringify(finalOptions.body);
  }

  return fetch(url, finalOptions);
};

export const apiClient = {
<<<<<<< HEAD
  get: (path: string) => request(path),
  post: (path: string, body: any) => request(path, { method: 'POST', body }),
  put: (path: string, body: any) => request(path, { method: 'PUT', body }),
  patch: (path: string, body: any) => request(path, { method: 'PATCH', body }),
  delete: (path: string) => request(path, { method: 'DELETE' }),
=======
  get: (path: string, options: any = {}) => request(path, { ...options }),
  post: (path: string, body: any, options: any = {}) => request(path, { method: 'POST', body, ...options }),
  put: (path: string, body: any, options: any = {}) => request(path, { method: 'PUT', body, ...options }),
  patch: (path: string, body: any, options: any = {}) => request(path, { method: 'PATCH', body, ...options }),
  delete: (path: string, options: any = {}) => request(path, { method: 'DELETE', ...options }),
>>>>>>> main

  rawGet: (path: string) => rawRequest(path, { method: 'GET' }),
  rawPost: (path: string, body: any) => rawRequest(path, { method: 'POST', body }),
  rawPut: (path: string, body: any) => rawRequest(path, { method: 'PUT', body }),
  rawPatch: (path: string, body: any) => rawRequest(path, { method: 'PATCH', body }),
<<<<<<< HEAD
=======
  rawDelete: (path: string) => rawRequest(path, { method: 'DELETE' }),
>>>>>>> main
};
