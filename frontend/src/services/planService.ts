import { apiClient } from '../config/apiClient';

export const planService = {
  async list() {
    return apiClient.get('/plans');
  },
  async getSignupPromotion() {
    return apiClient.get('/signup-promotion', { authMode: 'none' });
  },
};
