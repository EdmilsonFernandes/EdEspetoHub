import { apiClient } from '../config/apiClient';

export const customerAccountService = {
  register(payload: { fullName: string; email: string; password: string; phone?: string }) {
    return apiClient.post('/customer/auth/register', payload);
  },

  login(payload: { email: string; password: string }) {
    return apiClient.post('/customer/auth/login', payload);
  },

  me() {
    return apiClient.get('/customer/me');
  },

  updateMe(payload: { fullName?: string; phone?: string }) {
    return apiClient.patch('/customer/me', payload);
  },

  changePassword(payload: { currentPassword: string; newPassword: string }) {
    return apiClient.post('/customer/me/change-password', payload);
  },

  listOrders() {
    return apiClient.get('/customer/orders');
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
};

