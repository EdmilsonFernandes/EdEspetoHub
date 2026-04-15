import { apiClient } from '../config/apiClient';

const PUBLIC_STORE_CACHE_TTL_MS = 60 * 1000;
const publicStoreMemoryCache = new Map<string, { ts: number; data: any }>();

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

const toJson = async (response: any) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.error || 'Erro ao comunicar com a loja');
  }
  return response.json();
};

export const storeService = {
  async create(payload: any) {
    const response = await apiClient.rawPost('/auth/register', payload);
    return toJson(response);
  },

  async fetchBySlug(slug: any) {
    if (!slug) return null;
    const cached = readPublicStoreCache(slug);
    if (cached) return cached;
    const response = await apiClient.rawGet(`/stores/slug/${slug}`);
    if (response.status === 404) return null;
    const data = await toJson(response);
    return writePublicStoreCache(slug, data);
  },

  async listPortfolio() {
    const response = await apiClient.rawGet('/public/stores');
    return toJson(response);
  },

  async trackPublicVisit(slug: string, payload: any) {
    const response = await apiClient.rawPost(`/public/stores/slug/${slug}/track`, payload);
    return toJson(response);
  },

  async getLinkStats(storeId: string, days = 7) {
    const response = await apiClient.rawGet(`/stores/${storeId}/link-stats?days=${days}`);
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
    const response = await apiClient.rawPost(`/stores/slug/${slug}/postal/quote`, payload);
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
