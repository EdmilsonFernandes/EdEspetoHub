import { apiClient } from '../config/apiClient';

const PUBLIC_STORE_CACHE_TTL_MS = 60 * 1000;
const publicStoreMemoryCache = new Map<string, { ts: number; data: any }>();
const publicPortfolioMemoryCache = new Map<string, { ts: number; data: any }>();

const getStoreCacheKey = (slug: string) => `public:store:${String(slug || '').trim().toLowerCase()}`;

const readPublicStoreCache = (slug: string) => {
  const normalizedSlug = String(slug || '').trim().toLowerCase();
  if (!normalizedSlug) return null;
  const now = Date.now();
  const memory = publicStoreMemoryCache.get(normalizedSlug);
  if (memory && now - Number(memory.ts || 0) <= PUBLIC_STORE_CACHE_TTL_MS) {
    return memory.data;
  }
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(getStoreCacheKey(normalizedSlug));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const ts = Number(parsed?.ts || 0);
    if (!ts || now - ts > PUBLIC_STORE_CACHE_TTL_MS) {
      sessionStorage.removeItem(getStoreCacheKey(normalizedSlug));
      publicStoreMemoryCache.delete(normalizedSlug);
      return null;
    }
    publicStoreMemoryCache.set(normalizedSlug, { ts, data: parsed?.data ?? null });
    return parsed?.data ?? null;
  } catch {
    return null;
  }
};

const writePublicStoreCache = (slug: string, data: any) => {
  const normalizedSlug = String(slug || '').trim().toLowerCase();
  if (!normalizedSlug) return data;
  const payload = { ts: Date.now(), data };
  publicStoreMemoryCache.set(normalizedSlug, payload);
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(getStoreCacheKey(normalizedSlug), JSON.stringify(payload));
    } catch {
      // ignore cache write failure
    }
  }
  return data;
};

const readCollectionCache = (key: string, ttlMs: number) => {
  const now = Date.now();
  const memory = publicPortfolioMemoryCache.get(key);
  if (memory && now - Number(memory.ts || 0) <= ttlMs) {
    return memory.data;
  }
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const ts = Number(parsed?.ts || 0);
    if (!ts || now - ts > ttlMs) {
      sessionStorage.removeItem(key);
      publicPortfolioMemoryCache.delete(key);
      return null;
    }
    publicPortfolioMemoryCache.set(key, { ts, data: parsed?.data ?? null });
    return parsed?.data ?? null;
  } catch {
    return null;
  }
};

const writeCollectionCache = (key: string, data: any) => {
  const payload = { ts: Date.now(), data };
  publicPortfolioMemoryCache.set(key, payload);
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(key, JSON.stringify(payload));
    } catch {
      // ignore cache write failure
    }
  }
  return data;
};

const clearPortfolioCollectionCache = () => {
  publicPortfolioMemoryCache.clear();
  if (typeof window === 'undefined') return;
  try {
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith('public:portfolio:'))
      .forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // ignore cache clear failure
  }
};

const toJson = async (response: any) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.error || 'Erro ao comunicar com a loja');
  }
  return response.json();
};

export const storeService = {
  clearPortfolioCache() {
    clearPortfolioCollectionCache();
  },

  async preflightOwner(payload: any) {
    const response = await apiClient.rawPost('/auth/register/preflight', payload);
    return toJson(response);
  },

  async create(payload: any) {
    const response = await apiClient.rawPost('/auth/register', payload);
    return toJson(response);
  },

  async fetchBySlug(slug: any) {
    if (!slug) return null;
    const cached = readPublicStoreCache(slug);
    if (cached) return cached;
    const response = await apiClient.rawGet(`/stores/slug/${slug}`, { authMode: 'none' });
    if (response.status === 404) return null;
    const data = await toJson(response);
    return writePublicStoreCache(slug, data);
  },

  async listPortfolio(params?: { lat?: number | null; lng?: number | null; city?: string | null; state?: string | null }) {
    const search = new URLSearchParams();
    if (params && Number.isFinite(Number(params.lat))) search.set('lat', String(params.lat));
    if (params && Number.isFinite(Number(params.lng))) search.set('lng', String(params.lng));
    if (params?.city) search.set('city', String(params.city).trim());
    if (params?.state) search.set('state', String(params.state).trim());
    const suffix = search.toString() ? `?${search.toString()}` : '';
    const cacheKey = `public:portfolio:list:${suffix || 'default'}`;
    const cached = readCollectionCache(cacheKey, 45 * 1000);
    if (cached) return cached;
    const response = await apiClient.rawGet(`/public/stores${suffix}`, { authMode: 'none' });
    const data = await toJson(response);
    return writeCollectionCache(cacheKey, data);
  },

  async discoverPortfolio(params?: { lat?: number | null; lng?: number | null; city?: string | null; state?: string | null }) {
    const search = new URLSearchParams();
    if (params && Number.isFinite(Number(params.lat))) search.set('lat', String(params.lat));
    if (params && Number.isFinite(Number(params.lng))) search.set('lng', String(params.lng));
    if (params?.city) search.set('city', String(params.city).trim());
    if (params?.state) search.set('state', String(params.state).trim());
    const suffix = search.toString() ? `?${search.toString()}` : '';
    const cacheKey = `public:portfolio:discovery:${suffix || 'default'}`;
    const cached = readCollectionCache(cacheKey, 30 * 1000);
    if (cached) return cached;
    const response = await apiClient.rawGet(`/public/stores/discovery${suffix}`, { authMode: 'none' });
    const data = await toJson(response);
    return writeCollectionCache(cacheKey, data);
  },

  async trackPublicVisit(slug: string, payload: any) {
    const response = await apiClient.rawPost(`/public/stores/slug/${slug}/track`, payload, { authMode: 'none' });
    return toJson(response);
  },

  async getLinkStats(storeId: string, days = 7) {
    const response = await apiClient.rawGet(`/stores/${storeId}/link-stats?days=${days}`);
    return toJson(response);
  },

  async getDashboardAnalytics(
    storeId: string,
    params?: {
      periodDays?: string | number | null;
      monthKey?: string | null;
      startDate?: string | null;
      endDate?: string | null;
    }
  ) {
    const search = new URLSearchParams();
    if (params?.periodDays !== undefined && params?.periodDays !== null && String(params.periodDays).trim() !== '') {
      search.set('periodDays', String(params.periodDays).trim());
    }
    if (params?.monthKey) {
      search.set('monthKey', String(params.monthKey).trim());
    }
    if (params?.startDate) {
      search.set('startDate', String(params.startDate).trim());
    }
    if (params?.endDate) {
      search.set('endDate', String(params.endDate).trim());
    }
    const suffix = search.toString() ? `?${search.toString()}` : '';
    const response = await apiClient.rawGet(`/stores/${storeId}/dashboard-analytics${suffix}`);
    return toJson(response);
  },

  async getMercadoPagoAccount(storeId: string) {
    const response = await apiClient.rawGet(`/stores/${storeId}/payment-accounts/mercadopago`);
    return toJson(response);
  },

  async createMercadoPagoConnectUrl(storeId: string, returnTo?: string) {
    const response = await apiClient.rawPost(`/stores/${storeId}/payment-accounts/mercadopago/connect`, { returnTo });
    return toJson(response);
  },

  async disconnectMercadoPago(storeId: string) {
    const response = await apiClient.rawDelete(`/stores/${storeId}/payment-accounts/mercadopago`);
    return toJson(response);
  },

  async updateSettings(slug: any, payload: any) {
    const response = await apiClient.rawPut(`/stores/${slug}/settings`, payload);
    return toJson(response);
  },

  async update(storeId: string, payload: any) {
    const response = await apiClient.rawPut(`/stores/${storeId}`, payload);
    return toJson(response);
  },

  async quotePostalBySlug(
    slug: string,
    payload: { destinationZip: string; items: Array<{ productId?: string; quantity?: number; weightG?: number; lengthCm?: number; widthCm?: number; heightCm?: number; name?: string }> }
  ) {
    const response = await apiClient.rawPost(`/stores/slug/${slug}/postal/quote`, payload, { authMode: 'none' });
    return toJson(response);
  },

  async quotePostalByStore(
    storeId: string,
    payload: { destinationZip: string; items: Array<{ productId?: string; quantity?: number; weightG?: number; lengthCm?: number; widthCm?: number; heightCm?: number; name?: string }> }
  ) {
    const response = await apiClient.rawPost(`/stores/${storeId}/postal/quote`, payload);
    return toJson(response);
  },

  async setStatus(storeId: any, isOpen: any) {
    const response = await apiClient.rawPut(`/stores/${storeId}/status`, { open: isOpen });
    return toJson(response);
  },

  async listUsers(storeId: string) {
    const response = await apiClient.rawGet(`/stores/${storeId}/users`);
    return toJson(response);
  },

  async createUser(
    storeId: string,
    payload: { fullName: string; email: string; password: string; phone?: string; role: 'ADMIN' | 'OPERATOR' }
  ) {
    const response = await apiClient.rawPost(`/stores/${storeId}/users`, payload);
    return toJson(response);
  },

  async updateUserPassword(storeId: string, userId: string, payload: { newPassword: string }) {
    const response = await apiClient.rawPatch(`/stores/${storeId}/users/${userId}/password`, payload);
    return toJson(response);
  },

  async deleteUser(storeId: string, userId: string) {
    const response = await apiClient.rawDelete(`/stores/${storeId}/users/${userId}`);
    return toJson(response);
  },
};
