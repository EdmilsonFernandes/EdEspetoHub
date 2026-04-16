// @ts-nocheck
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
    const response = await apiClient.rawGet('/public/condominiums', {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    return toJson(response);
  },

  async listStores(slug: string) {
    const response = await apiClient.rawGet(`/public/condominiums/${encodeURIComponent(slug)}/stores`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    return toJson(response);
  },

  adminOverview() {
    return adminRequest('/admin/condominiums/manage');
  },

  adminCreate(payload: any) {
    return adminRequest('/admin/condominiums', { method: 'POST', body: payload });
  },

  adminUpdate(condominiumId: string, payload: any) {
    return adminRequest(`/admin/condominiums/${encodeURIComponent(condominiumId)}`, { method: 'PATCH', body: payload });
  },

  adminDeactivate(condominiumId: string) {
    return adminRequest(`/admin/condominiums/${encodeURIComponent(condominiumId)}/deactivate`, { method: 'PATCH' });
  },

  adminCreateEvent(condominiumId: string, payload: any) {
    return adminRequest(`/admin/condominiums/${encodeURIComponent(condominiumId)}/events`, { method: 'POST', body: payload });
  },

  adminUpdateEvent(eventId: string, payload: any) {
    return adminRequest(`/admin/condominium-events/${encodeURIComponent(eventId)}`, { method: 'PATCH', body: payload });
  },

  adminDeactivateEvent(eventId: string) {
    return adminRequest(`/admin/condominium-events/${encodeURIComponent(eventId)}/deactivate`, { method: 'PATCH' });
  },

  adminApproveStore(condominiumId: string, storeId: string) {
    return adminRequest(`/admin/condominiums/${encodeURIComponent(condominiumId)}/stores`, { method: 'POST', body: { storeId } });
  },

  adminUpdateStoreSettings(
    condominiumId: string,
    storeId: string,
    payload: {
      allowPickupAtStall?: boolean;
      allowApartmentDelivery?: boolean;
      apartmentDeliveryFee?: number | string | null;
    }
  ) {
    return adminRequest(`/admin/condominiums/${encodeURIComponent(condominiumId)}/stores/${encodeURIComponent(storeId)}/settings`, {
      method: 'PATCH',
      body: payload,
    });
  },

  adminAddStoreToEvent(eventId: string, storeId: string) {
    return adminRequest(`/admin/condominium-events/${encodeURIComponent(eventId)}/stores`, { method: 'POST', body: { storeId } });
  },

  adminReviewRequest(requestId: string, payload: { status: 'pending' | 'approved' | 'rejected' | 'blocked' | 'cancelled'; reviewNote?: string }) {
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
