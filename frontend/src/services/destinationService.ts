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

const PUBLIC_DESTINATION_CACHE_TTL_MS = 60_000;
const publicDestinationCache = new Map<string, { ts: number; data: any }>();
const publicDestinationInflight = new Map<string, Promise<any>>();

const readPublicDestinationCache = (key: string) => {
  const normalizedKey = String(key || '').trim();
  if (!normalizedKey) return null;
  const now = Date.now();
  const memory = publicDestinationCache.get(normalizedKey);
  if (memory && now - Number(memory.ts || 0) <= PUBLIC_DESTINATION_CACHE_TTL_MS) {
    return memory.data;
  }
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(normalizedKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const ts = Number(parsed?.ts || 0);
    if (!ts || now - ts > PUBLIC_DESTINATION_CACHE_TTL_MS) {
      sessionStorage.removeItem(normalizedKey);
      publicDestinationCache.delete(normalizedKey);
      return null;
    }
    publicDestinationCache.set(normalizedKey, { ts, data: parsed?.data ?? null });
    return parsed?.data ?? null;
  } catch {
    return null;
  }
};

const writePublicDestinationCache = (key: string, data: any) => {
  const normalizedKey = String(key || '').trim();
  if (!normalizedKey) return data;
  const payload = { ts: Date.now(), data };
  publicDestinationCache.set(normalizedKey, payload);
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(normalizedKey, JSON.stringify(payload));
    } catch {
      // ignore cache write failure
    }
  }
  return data;
};

const publicCachedRawGet = async (cacheKey: string, path: string, options?: { forceRefresh?: boolean }) => {
  if (!options?.forceRefresh) {
    const cached = readPublicDestinationCache(cacheKey);
    if (cached) return cached;
  }

  const inflightKey = options?.forceRefresh ? `${cacheKey}:force` : cacheKey;
  const inflight = publicDestinationInflight.get(inflightKey);
  if (inflight) return inflight;

  const request = apiClient
    .rawGet(path, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
      authMode: 'none',
    })
    .then(toJson)
    .then((data) => writePublicDestinationCache(cacheKey, data))
    .finally(() => {
      publicDestinationInflight.delete(inflightKey);
    });

  publicDestinationInflight.set(inflightKey, request);
  return request;
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
  async listPublic(params?: { lat?: number | string | null; lng?: number | string | null; city?: string | null; state?: string | null }, options?: { forceRefresh?: boolean }) {
    const search = new URLSearchParams();
    if (params?.lat !== null && params?.lat !== undefined && String(params.lat).trim()) search.set('lat', String(params.lat));
    if (params?.lng !== null && params?.lng !== undefined && String(params.lng).trim()) search.set('lng', String(params.lng));
    if (params?.city) search.set('city', String(params.city).trim());
    if (params?.state) search.set('state', String(params.state).trim().toUpperCase());
    const suffix = search.toString() ? `?${search.toString()}` : '';
    return publicCachedRawGet(`public:destinations:list:${suffix || 'default'}`, `/public/destinations${suffix}`, options);
  },

  async getPublic(slug: string, options?: { forceRefresh?: boolean }) {
    const normalizedSlug = String(slug || '').trim().toLowerCase();
    return publicCachedRawGet(
      `public:destinations:detail:${normalizedSlug}`,
      `/public/destinations/${encodeURIComponent(slug)}`,
      options
    );
  },

  async getHospitalityPlace(destinationSlug: string, placeSlug: string, options?: { forceRefresh?: boolean }) {
    const normalizedDestinationSlug = String(destinationSlug || '').trim().toLowerCase();
    const normalizedPlaceSlug = String(placeSlug || '').trim().toLowerCase();
    return publicCachedRawGet(
      `public:destinations:hospitality:${normalizedDestinationSlug}:${normalizedPlaceSlug}`,
      `/public/destinations/${encodeURIComponent(destinationSlug)}/hospitality/${encodeURIComponent(placeSlug)}`,
      options
    );
  },

  prefetchPublic(slug: string) {
    if (!String(slug || '').trim()) return Promise.resolve(null);
    return destinationService.getPublic(slug).catch(() => null);
  },

  prefetchHospitalityPlace(destinationSlug: string, placeSlug: string) {
    if (!String(destinationSlug || '').trim() || !String(placeSlug || '').trim()) return Promise.resolve(null);
    return destinationService.getHospitalityPlace(destinationSlug, placeSlug).catch(() => null);
  },

  createPartnerRequest(payload: any) {
    return apiClient.post('/public/destination-partner-requests', payload, { authMode: 'none' });
  },

  adminOverview(params?: any) {
    const search = new URLSearchParams();
    if (params?.lite !== undefined) search.set('lite', String(params.lite));
    const suffix = search.toString() ? `?${search.toString()}` : '';
    return superAdminRequest(`/admin/destinations/manage${suffix}`);
  },

  adminCatalogSummary(params?: any) {
    const search = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim()) search.set(key, String(value));
    });
    const suffix = search.toString() ? `?${search.toString()}` : '';
    return superAdminRequest(`/admin/destinations/manage/summary${suffix}`);
  },

  adminDestinationPlaces(destinationId: string, params?: any) {
    const search = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim()) search.set(key, String(value));
    });
    const suffix = search.toString() ? `?${search.toString()}` : '';
    return superAdminRequest(`/admin/destinations/${encodeURIComponent(destinationId)}/places${suffix}`);
  },

  adminDestinationListings(destinationId: string, params?: any) {
    const search = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim()) search.set(key, String(value));
    });
    const suffix = search.toString() ? `?${search.toString()}` : '';
    return superAdminRequest(`/admin/destinations/${encodeURIComponent(destinationId)}/listings${suffix}`);
  },

  adminDestinationBanners(destinationId: string) {
    return superAdminRequest(`/admin/destinations/${encodeURIComponent(destinationId)}/banners`);
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

  adminUpdateBanner(bannerId: string, payload: any) {
    return superAdminRequest(`/admin/destination-banners/${encodeURIComponent(bannerId)}`, { method: 'PATCH', body: payload });
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
