import { apiClient } from '../config/apiClient';

export const planService = {
  async list() {
    return apiClient.get('/plans');
  },
  async listForStore(storeId: string) {
    return apiClient.get(`/stores/${storeId}/plans`);
  },
  async getSignupPromotion() {
    return apiClient.get('/signup-promotion', { authMode: 'none' });
  },
};
