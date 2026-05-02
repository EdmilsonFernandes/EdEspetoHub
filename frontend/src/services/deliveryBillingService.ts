import { apiClient } from '../config/apiClient';

export const deliveryBillingService = {
  async getCurrentCycle(storeId: string) {
    return apiClient.get(`/stores/${storeId}/delivery-billing`);
  },

  async ensurePayment(storeId: string) {
    return apiClient.post(`/stores/${storeId}/delivery-billing/pay`, {});
  },
};
