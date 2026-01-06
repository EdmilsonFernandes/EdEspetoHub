import { apiClient } from '../config/apiClient';

const toJson = async (response: any) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.error || 'Erro ao consultar pagamento');
  }
  return response.json();
};

export const paymentService = {
  async getById(paymentId: any) {
    const response = await apiClient.rawGet(`/payments/${paymentId}`);
    return toJson(response);
  },
  async getEvents(paymentId: any, limit = 25, offset = 0) {
    const response = await apiClient.rawGet(`/payments/${paymentId}/events?limit=${limit}&offset=${offset}`);
    return toJson(response);
  },
};
