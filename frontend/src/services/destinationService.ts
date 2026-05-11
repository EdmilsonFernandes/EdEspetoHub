// @ts-nocheck
import { apiClient } from '../config/apiClient';

const toJson = async (response: any) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const err: any = new Error(error.message || error.error || 'Erro ao carregar destinos');
    err.status = response.status;
    if (error.code) err.code = error.code;
    if (error.details) err.details = error.details;
    throw err;
  }
  return response.json();
};

const superAdminRequest = async (path: string, options: any = {}) => {
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

export const destinationService = {
  async listPublic(params?: { lat?: number | string | null; lng?: number | string | null; city?: string | null; state?: string | null }) {
    const search = new URLSearchParams();
    if (params?.lat !== null && params?.lat !== undefined && String(params.lat).trim()) search.set('lat', String(params.lat));
    if (params?.lng !== null && params?.lng !== undefined && String(params.lng).trim()) search.set('lng', String(params.lng));
    if (params?.city) search.set('city', String(params.city).trim());
    if (params?.state) search.set('state', String(params.state).trim().toUpperCase());
    const suffix = search.toString() ? `?${search.toString()}` : '';
    const response = await apiClient.rawGet(`/public/destinations${suffix}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
      authMode: 'none',
    });
    return toJson(response);
  },

  async getPublic(slug: string) {
    const response = await apiClient.rawGet(`/public/destinations/${encodeURIComponent(slug)}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
      authMode: 'none',
    });
    return toJson(response);
  },

  async getHospitalityPlace(destinationSlug: string, placeSlug: string) {
    const response = await apiClient.rawGet(
      `/public/destinations/${encodeURIComponent(destinationSlug)}/hospitality/${encodeURIComponent(placeSlug)}`,
      {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
        authMode: 'none',
      }
    );
    return toJson(response);
  },

  createPartnerRequest(payload: any) {
    return apiClient.post('/public/destination-partner-requests', payload, { authMode: 'none' });
  },

  adminOverview() {
    return superAdminRequest('/admin/destinations/manage');
  },

  adminCreateDestination(payload: any) {
    return superAdminRequest('/admin/destinations', { method: 'POST', body: payload });
  },

  adminUpdateDestination(destinationId: string, payload: any) {
    return superAdminRequest(`/admin/destinations/${encodeURIComponent(destinationId)}`, { method: 'PATCH', body: payload });
  },

  adminCreateBanner(payload: any) {
    return superAdminRequest('/admin/destination-banners', { method: 'POST', body: payload });
  },

  adminCreateHospitalityPlace(payload: any) {
    return superAdminRequest('/admin/hospitality-places', { method: 'POST', body: payload });
  },

  adminUpdateHospitalityPlace(placeId: string, payload: any) {
    return superAdminRequest(`/admin/hospitality-places/${encodeURIComponent(placeId)}`, { method: 'PATCH', body: payload });
  },

  adminCreateListing(payload: any) {
    return superAdminRequest('/admin/destination-listings', { method: 'POST', body: payload });
  },

  adminUpdateListing(listingId: string, payload: any) {
    return superAdminRequest(`/admin/destination-listings/${encodeURIComponent(listingId)}`, { method: 'PATCH', body: payload });
  },

  adminLinkStore(placeId: string, payload: any) {
    return superAdminRequest(`/admin/hospitality-places/${encodeURIComponent(placeId)}/stores`, { method: 'POST', body: payload });
  },

  adminReviewPartnerRequest(requestId: string, payload: any) {
    return superAdminRequest(`/admin/destination-partner-requests/${encodeURIComponent(requestId)}/review`, { method: 'PATCH', body: payload });
  },

  adminReviewStoreRequest(requestId: string, payload: any) {
    return superAdminRequest(`/admin/destination-store-requests/${encodeURIComponent(requestId)}/review`, { method: 'PATCH', body: payload });
  },

  listStoreOptions(storeId: string) {
    return apiClient.get(`/stores/${encodeURIComponent(storeId)}/destinations`);
  },

  createStoreRequest(storeId: string, payload: any) {
    return apiClient.post(`/stores/${encodeURIComponent(storeId)}/destination-requests`, payload);
  },

  removeStoreDestination(storeId: string, placeId: string) {
    return apiClient.delete(`/stores/${encodeURIComponent(storeId)}/destinations/${encodeURIComponent(placeId)}`);
  },
};
