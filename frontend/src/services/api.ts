const API_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000/api';

async function request(path: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || 'Erro ao comunicar com a API');
  }
  return res.json();
}

export const api = {
  registerOwner: (payload: any) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: any) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  fetchStore: (slug: string) => request(`/stores/${slug}`),
  updateStore: (id: string, payload: any) => request(`/stores/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  setStatus: (id: string, open: boolean) => request(`/stores/${id}/status`, { method: 'PUT', body: JSON.stringify({ open }) }),
  listProducts: (storeId: string) => request(`/stores/${storeId}/products`),
  createProduct: (storeId: string, payload: any) => request(`/stores/${storeId}/products`, { method: 'POST', body: JSON.stringify(payload) }),
  listOrders: (storeId: string) => request(`/stores/${storeId}/orders`),
  createOrder: (storeId: string, payload: any) => request(`/stores/${storeId}/orders`, { method: 'POST', body: JSON.stringify(payload) }),
};
