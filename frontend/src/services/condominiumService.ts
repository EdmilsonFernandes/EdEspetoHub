import { apiClient } from '../config/apiClient';

const toJson = async (response: any) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.error || 'Erro ao carregar condominios');
  }
  return response.json();
};

const adminRequest = async (path: string, options: any = {}) => {
  const token = localStorage.getItem('superAdminToken') || '';
  const base = import.meta.env.VITE_API_BASE_URL || '/api';
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body && typeof options.body === 'object' ? JSON.stringify(options.body) : options.body,
  });
  return toJson(response);
};

export const condominiumService = {
  async listPublic() {
    const response = await apiClient.rawGet('/public/condominiums');
    return toJson(response);
  },

  async listStores(slug: string) {
    const response = await apiClient.rawGet(`/public/condominiums/${encodeURIComponent(slug)}/stores`);
    return toJson(response);
  },

  adminOverview() {
    return adminRequest('/admin/condominiums/manage');
  },

  adminCreate(payload: any) {
    return adminRequest('/admin/condominiums', { method: 'POST', body: payload });
  },

  adminCreateEvent(condominiumId: string, payload: any) {
    return adminRequest(`/admin/condominiums/${encodeURIComponent(condominiumId)}/events`, { method: 'POST', body: payload });
  },

  adminApproveStore(condominiumId: string, storeId: string) {
    return adminRequest(`/admin/condominiums/${encodeURIComponent(condominiumId)}/stores`, { method: 'POST', body: { storeId } });
  },

  adminAddStoreToEvent(eventId: string, storeId: string) {
    return adminRequest(`/admin/condominium-events/${encodeURIComponent(eventId)}/stores`, { method: 'POST', body: { storeId } });
  },

  adminReviewRequest(requestId: string, payload: { status: 'approved' | 'rejected' | 'blocked'; reviewNote?: string }) {
    return adminRequest(`/admin/condominium-requests/${encodeURIComponent(requestId)}/review`, { method: 'PATCH', body: payload });
  },

  listStoreOptions(storeId: string) {
    return apiClient.get(`/stores/${encodeURIComponent(storeId)}/condominiums`);
  },

  createStoreRequest(storeId: string, payload: { condominiumId: string; message?: string }) {
    return apiClient.post(`/stores/${encodeURIComponent(storeId)}/condominium-requests`, payload);
  },

  removeStoreCondominium(storeId: string, condominiumId: string) {
    return apiClient.delete(`/stores/${encodeURIComponent(storeId)}/condominiums/${encodeURIComponent(condominiumId)}`);
  },
};
