import { apiClient } from '../config/apiClient';

export const subscriptionService = {
  async create(payload) {
    return apiClient.post('/subscriptions', payload);
  },
  async getByStore(storeId) {
    return apiClient.get(`/stores/${storeId}/subscription`);
  },
  async renew(id, payload) {
    return apiClient.post(`/subscriptions/${id}/renew`, payload);
  },
  async suspend(id) {
    return apiClient.patch(`/subscriptions/${id}/status`, { status: 'SUSPENDED' });
  },
  async reactivate(id) {
    return apiClient.patch(`/subscriptions/${id}/status`, { status: 'ACTIVE' });
  },
};
