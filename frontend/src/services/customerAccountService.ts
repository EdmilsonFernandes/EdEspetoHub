import { apiClient } from '../config/apiClient';

export const customerAccountService = {
  register(payload: { fullName: string; email: string; password: string; phone?: string; termsAccepted?: boolean; lgpdAccepted?: boolean }) {
    return apiClient.post('/customer/auth/register', payload);
  },

  login(payload: { email: string; password: string }) {
    return apiClient.post('/customer/auth/login', payload);
  },

  verifyEmailCode(payload: { email: string; code: string }) {
    return apiClient.post('/customer/auth/verify-email-code', payload);
  },

  resendEmailCode(email: string) {
    return apiClient.post('/customer/auth/resend-email-code', { email });
  },

  me() {
    return apiClient.get('/customer/me');
  },

  updateMe(payload: { fullName?: string; phone?: string; profileImageFile?: string | null }) {
    return apiClient.patch('/customer/me', payload);
  },

  changePassword(payload: { currentPassword: string; newPassword: string }) {
    return apiClient.post('/customer/me/change-password', payload);
  },

  deactivate() {
    return apiClient.patch('/customer/me/deactivate', {});
  },

  forgotPassword(email: string) {
    return apiClient.post('/auth/forgot-password', { email });
  },

  listOrders(params?: { limit?: number; offset?: number }) {
    const qs = params
      ? `?${new URLSearchParams({ limit: String(params.limit ?? 10), offset: String(params.offset ?? 0) }).toString()}`
      : '';
    return apiClient.get(`/customer/orders${qs}`);
  },

  cancelOrder(orderId: string, payload: { reason: string }) {
    return apiClient.post(`/customer/orders/${orderId}/cancel`, payload);
  },

  listAddresses() {
    return apiClient.get('/customer/addresses');
  },

  createAddress(payload: any) {
    return apiClient.post('/customer/addresses', payload);
  },

  updateAddress(addressId: string, payload: any) {
    return apiClient.patch(`/customer/addresses/${addressId}`, payload);
  },

  setDefaultAddress(addressId: string) {
    return apiClient.patch(`/customer/addresses/${addressId}/default`, {});
  },

  deleteAddress(addressId: string) {
    return apiClient.delete(`/customer/addresses/${addressId}`);
  },

  registerPushToken(payload: { token: string; platform?: string; appVersion?: string; deviceModel?: string }) {
    return apiClient.post('/customer/push/register', payload);
  },

  unregisterPushToken(payload?: { token?: string | null }) {
    return apiClient.post('/customer/push/unregister', payload || {});
  },

  registerGuestPushToken(payload: {
    guestId: string;
    token: string;
    platform?: string;
    appVersion?: string;
    deviceModel?: string;
  }) {
    return apiClient.post('/public/push/register', payload);
  },

  unregisterGuestPushToken(payload: { guestId: string; token?: string | null }) {
    return apiClient.post('/public/push/unregister', payload || {});
  },
};
