import { apiClient } from '../config/apiClient';

export const subscriptionService = {
  async create(payload: any) {
    return apiClient.post('/subscriptions', payload);
  },
  async getByStore(storeId: any) {
    return apiClient.get(`/stores/${storeId}/subscription`);
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
