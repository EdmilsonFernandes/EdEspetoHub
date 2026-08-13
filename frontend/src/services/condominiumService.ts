// @ts-nocheck
import { apiClient } from '../config/apiClient';

const toJson = async (response: any) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const err: any = new Error(error.message || error.error || 'Erro ao carregar condominios');
    err.status = response.status;
    if (error.code) err.code = error.code;
    if (error.details) err.details = error.details;
    throw err;
  }
  return response.json();
};

const PUBLIC_CONDOMINIUM_CACHE_TTL_MS = 30_000;
const publicCondominiumCache = new Map<string, { ts: number; data: any }>();
const publicCondominiumInflight = new Map<string, Promise<any>>();

const readPublicCondominiumCache = (key: string) => {
  const now = Date.now();
  const entry = publicCondominiumCache.get(key);
  if (entry && now - Number(entry.ts || 0) <= PUBLIC_CONDOMINIUM_CACHE_TTL_MS) {
    return entry.data;
  }
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const ts = Number(parsed?.ts || 0);
    if (!ts || now - ts > PUBLIC_CONDOMINIUM_CACHE_TTL_MS) {
      sessionStorage.removeItem(key);
      publicCondominiumCache.delete(key);
      return null;
    }
    publicCondominiumCache.set(key, { ts, data: parsed?.data ?? null });
    return parsed?.data ?? null;
  } catch {
    return null;
  }
};

const writePublicCondominiumCache = (key: string, data: any) => {
  const payload = { ts: Date.now(), data };
  publicCondominiumCache.set(key, payload);
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(key, JSON.stringify(payload));
    } catch {
      // ignore cache write failure
    }
  }
  return data;
};

const publicCachedRawGet = async (key: string, path: string) => {
  const cached = readPublicCondominiumCache(key);
  if (cached) return cached;

  const inflight = publicCondominiumInflight.get(key);
  if (inflight) return inflight;

  const request = apiClient
    .rawGet(path, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
      authMode: 'none',
    })
    .then(toJson)
    .then((data) => writePublicCondominiumCache(key, data))
    .finally(() => {
      publicCondominiumInflight.delete(key);
    });

  publicCondominiumInflight.set(key, request);
  return request;
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

const condominiumRequest = async (path: string, options: any = {}) => {
  const token = (() => {
    try {
      const raw = localStorage.getItem('condominiumSession');
      if (!raw) return '';
      const parsed = JSON.parse(raw);
      return parsed?.token || '';
    } catch {
      return '';
    }
  })();
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
    return publicCachedRawGet('public:condominiums:list', '/public/condominiums');
  },

  async listStores(slug: string) {
    const normalizedSlug = String(slug || '').trim().toLowerCase();
    return publicCachedRawGet(`public:condominiums:stores:${normalizedSlug}`, `/public/condominiums/${encodeURIComponent(slug)}/stores`);
  },

  async listPermanentStores(slug: string) {
    const normalizedSlug = String(slug || '').trim().toLowerCase();
    return publicCachedRawGet(`public:condominiums:stores-permanent:${normalizedSlug}`, `/public/condominiums/${encodeURIComponent(slug)}/stores/permanent`);
  },

  prefetchStores(slug: string) {
    if (!String(slug || '').trim()) return Promise.resolve(null);
    return condominiumService.listStores(slug).catch(() => null);
  },

  createAccessRequest(payload: any) {
    return apiClient.post('/public/condominium-access-requests', payload);
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

  adminCreateUser(condominiumId: string, payload: { name: string; email: string; password: string }) {
    return adminRequest(`/admin/condominiums/${encodeURIComponent(condominiumId)}/users`, { method: 'POST', body: payload });
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

  adminReviewAccessRequest(requestId: string, payload: { status: 'pending' | 'approved' | 'rejected' | 'cancelled'; reviewNote?: string }) {
    return adminRequest(`/admin/condominium-access-requests/${encodeURIComponent(requestId)}/review`, { method: 'PATCH', body: payload });
  },

  organizerOverview() {
    return condominiumRequest('/condominium/manage');
  },

  organizerUpdate(payload: any) {
    return condominiumRequest('/condominium/me', { method: 'PATCH', body: payload });
  },

  organizerCreateEvent(payload: any) {
    return condominiumRequest('/condominium/events', { method: 'POST', body: payload });
  },

  organizerUpdateEvent(eventId: string, payload: any) {
    return condominiumRequest(`/condominium/events/${encodeURIComponent(eventId)}`, { method: 'PATCH', body: payload });
  },

  organizerDeactivateEvent(eventId: string) {
    return condominiumRequest(`/condominium/events/${encodeURIComponent(eventId)}/deactivate`, { method: 'PATCH' });
  },

  organizerInviteStore(eventId: string, payload: { storeId: string; inviteNote?: string }) {
    return condominiumRequest(`/condominium/events/${encodeURIComponent(eventId)}/stores/invite`, { method: 'POST', body: payload });
  },

  organizerConfirmStore(eventId: string, payload: { storeId: string }) {
    return condominiumRequest(`/condominium/events/${encodeURIComponent(eventId)}/stores/confirm`, { method: 'POST', body: payload });
  },

  organizerUpdateStoreSettings(storeId: string, payload: any) {
    return condominiumRequest(`/condominium/stores/${encodeURIComponent(storeId)}/settings`, { method: 'PATCH', body: payload });
  },

  organizerRemoveStore(storeId: string) {
    return condominiumRequest(`/condominium/stores/${encodeURIComponent(storeId)}`, { method: 'DELETE' });
  },

  organizerReviewRequest(requestId: string, payload: { status: 'approved' | 'rejected'; reviewNote?: string }) {
    return condominiumRequest(`/condominium/requests/${encodeURIComponent(requestId)}/review`, { method: 'PATCH', body: payload });
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
