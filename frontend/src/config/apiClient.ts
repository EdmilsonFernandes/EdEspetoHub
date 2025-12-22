const resolveBaseUrl = () =>
{
  return import.meta.env.VITE_API_BASE_URL || '/api';
};

const API_BASE_URL = resolveBaseUrl();

const defaultHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
};

// 🔐 recupera token do adminSession
const getToken = (): string | null =>
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

const buildUrl = (path: string) =>
{
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

const handleResponse = async (response: Response) =>
{
  if (!response.ok)
  {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }
  return response.json();
};

const request = async (path: string, options: any = {}) =>
{
  const url = buildUrl(path);
  const token = getToken();

  const finalOptions: any = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };

  if (finalOptions.body && typeof finalOptions.body === 'object')
  {
    finalOptions.body = JSON.stringify(finalOptions.body);
  }

  const response = await fetch(url, finalOptions);
  return handleResponse(response); // ⬅️ NÃO mascarar erro
};

// RAW (para download/export etc)
const rawRequest = async (path: string, options: any = {}) =>
{
  const url = buildUrl(path);
  const token = getToken();

  const finalOptions: any = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };

  if (finalOptions.body && typeof finalOptions.body === 'object')
  {
    finalOptions.body = JSON.stringify(finalOptions.body);
  }

  return fetch(url, finalOptions);
};

export const apiClient = {
  get: (path: string) => request(path),
  post: (path: string, body: any) => request(path, { method: 'POST', body }),
  put: (path: string, body: any) => request(path, { method: 'PUT', body }),
  patch: (path: string, body: any) => request(path, { method: 'PATCH', body }),
  delete: (path: string) => request(path, { method: 'DELETE' }),

  rawGet: (path: string) => rawRequest(path, { method: 'GET' }),
  rawPost: (path: string, body: any) => rawRequest(path, { method: 'POST', body }),
  rawPut: (path: string, body: any) => rawRequest(path, { method: 'PUT', body }),
  rawPatch: (path: string, body: any) => rawRequest(path, { method: 'PATCH', body }),
};
