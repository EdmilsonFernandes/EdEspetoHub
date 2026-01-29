import { apiClient } from '../config/apiClient';

export const motoboyService = {
  async listAvailableOrders() {
    return apiClient.get('/motoboy/orders/available');
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
};
