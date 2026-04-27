import { apiClient } from '../config/apiClient';

const resolveStoreId = (storeId?: string) => {
  if (storeId) return storeId;
  try {
    const raw = localStorage.getItem('adminSession');
    return JSON.parse(raw || '{}')?.store?.id || '';
  } catch { return ''; }
};

export const promoPushService = {
  async create(storeId: string, payload: { title: string; message: string }) {
    return apiClient.post(`/stores/${storeId}/promo-pushes`, payload);
  },

  async listByStore(storeId?: string) {
    const id = resolveStoreId(storeId);
    return apiClient.get(`/stores/${id}/promo-pushes`);
  },

  async refreshPayment(pushId: string, storeId?: string) {
    const id = resolveStoreId(storeId);
    return apiClient.post(`/stores/${id}/promo-pushes/${pushId}/refresh-payment`, {});
  },

  async cancel(pushId: string, storeId?: string) {
    const id = resolveStoreId(storeId);
    return apiClient.delete(`/stores/${id}/promo-pushes/${pushId}`);
  },

  // Super admin
  async listPending() {
    return apiClient.get('/admin/promo-pushes/pending');
  },

  async approve(pushId: string) {
    return apiClient.post(`/admin/promo-pushes/${pushId}/approve`, {});
  },

  async reject(pushId: string, reason: string) {
    return apiClient.post(`/admin/promo-pushes/${pushId}/reject`, { reason });
  },
};
