import { apiClient } from '../config/apiClient';

export const platformService = {
  async listStores() {
    return apiClient.get('/admin/stores');
  },
  async getPublicMetrics() {
    return apiClient.get('/public/platform/metrics');
  },
  async suspendSubscription(subscriptionId: any) {
    return apiClient.patch(`/admin/stores/${subscriptionId}/suspend`, { subscriptionId });
  },
  async reactivateSubscription(subscriptionId: any) {
    return apiClient.patch(`/admin/stores/${subscriptionId}/reactivate`, { subscriptionId });
  },
};
