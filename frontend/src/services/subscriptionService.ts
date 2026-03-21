import { apiClient } from '../config/apiClient';

<<<<<<< HEAD
=======
const CACHE_TTL_MS = 30 * 1000;
const cacheByStore = new Map<string, { data: any; expiresAt: number }>();
const inflightByStore = new Map<string, Promise<any>>();

>>>>>>> main
export const subscriptionService = {
  async create(payload: any) {
    return apiClient.post('/subscriptions', payload);
  },
<<<<<<< HEAD
  async getByStore(storeId: any) {
    return apiClient.get(`/stores/${storeId}/subscription`);
=======
  async getByStore(storeId: any, options?: { force?: boolean }) {
    const key = String(storeId || '').trim();
    if (!key) return null;
    const force = Boolean(options?.force);
    const now = Date.now();

    if (!force) {
      const cached = cacheByStore.get(key);
      if (cached && cached.expiresAt > now) {
        return cached.data;
      }
      const inflight = inflightByStore.get(key);
      if (inflight) return inflight;
    }

    const request = apiClient
      .get(`/stores/${key}/subscription`)
      .then((data) => {
        cacheByStore.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
        return data;
      })
      .finally(() => {
        inflightByStore.delete(key);
      });

    inflightByStore.set(key, request);
    return request;
>>>>>>> main
  },
  async renew(id: any, payload: any) {
    return apiClient.post(`/subscriptions/${id}/renew`, payload);
  },
  async createRenewal(storeId: any, payload: any) {
    return apiClient.post(`/stores/${storeId}/subscription/renew`, payload);
  },
  async suspend(id: any) {
    return apiClient.patch(`/subscriptions/${id}/status`, { status: 'SUSPENDED' });
  },
  async reactivate(id: any) {
    return apiClient.patch(`/subscriptions/${id}/status`, { status: 'ACTIVE' });
  },
};
