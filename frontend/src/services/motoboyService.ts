import { apiClient } from '../config/apiClient';

export const motoboyService = {
  async listAvailableOrders() {
    return apiClient.get('/motoboy/orders/available');
  },
  async listHistory(days = 7) {
    return apiClient.get(`/motoboy/orders/history?days=${days}`);
  },
  async acceptOrder(orderId: string) {
    return apiClient.post(`/motoboy/orders/${orderId}/accept`, {});
  },
  async confirmPayment(orderId: string, cashTendered?: number | null) {
    return apiClient.post(`/motoboy/orders/${orderId}/confirm-payment`, {
      cashTendered: cashTendered ?? null,
    });
  },
  async markDelivered(orderId: string) {
    return apiClient.post(`/motoboy/orders/${orderId}/delivered`, {});
  },
  async finishOrder(orderId: string) {
    return apiClient.post(`/motoboy/orders/${orderId}/finish`, {});
  },
  async uploadDocument(payload: { docType: string; fileBase64: string }) {
    return apiClient.post('/motoboy/documents', payload);
  },
  async listDocuments() {
    return apiClient.get('/motoboy/documents');
  },
  async getProfile() {
    return apiClient.get('/motoboy/profile');
  },
  async updateProfile(payload: {
    vehicleType?: string | null;
    vehiclePlate?: string | null;
    vehicleModel?: string | null;
    vehicleColor?: string | null;
    city?: string | null;
    state?: string | null;
    address?: string | null;
  }) {
    return apiClient.put('/motoboy/profile', payload);
  },
  async listStoreRequests() {
    return apiClient.get('/motoboy/store-requests');
  },
  async createStoreRequests(storeIds: string[]) {
    return apiClient.post('/motoboy/store-requests', { storeIds });
  },
};
