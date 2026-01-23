import { apiClient } from '../config/apiClient';

export const planService = {
  async list() {
    return apiClient.get('/plans');
  },
};
