import { apiClient } from '../config/apiClient';

export const platformService = {
  async listStores() {
    return apiClient.get('/admin/stores');
  },
  async suspendSubscription(subscriptionId) {
    return apiClient.patch(`/admin/stores/${subscriptionId}/suspend`, { subscriptionId });
  },
  async reactivateSubscription(subscriptionId) {
    return apiClient.patch(`/admin/stores/${subscriptionId}/reactivate`, { subscriptionId });
  },
};
