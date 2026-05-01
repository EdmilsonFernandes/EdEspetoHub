import { apiClient } from '../config/apiClient';

export const storePushService = {
  registerPushToken(
    storeId: string,
    payload: { token: string; platform?: string; appVersion?: string; deviceModel?: string }
  ) {
    return apiClient.post(`/stores/${storeId}/push/register`, payload);
  },

  unregisterPushToken(storeId: string, payload?: { token?: string | null }) {
    return apiClient.post(`/stores/${storeId}/push/unregister`, payload || {});
  },
};
