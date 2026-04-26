import { apiClient } from '../config/apiClient';

const toJson = async (response: any) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.error || 'Falha ao processar destaque');
  }
  return response.json();
};

const resolveStoreIdFromSession = () => {
  try {
    const raw = localStorage.getItem('adminSession');
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    return String(parsed?.store?.id || '').trim();
  } catch {
    return '';
  }
};

export const featuredService = {
  async getPricingByStore(storeId?: string) {
    const targetStoreId = String(storeId || resolveStoreIdFromSession() || '').trim();
    if (!targetStoreId) throw new Error('Sessão de loja inválida');
    return apiClient.get(`/stores/${targetStoreId}/featured-pricing`);
  },

  async listByStore(storeId?: string) {
    const targetStoreId = String(storeId || resolveStoreIdFromSession() || '').trim();
    if (!targetStoreId) throw new Error('Sessão de loja inválida');
    return apiClient.get(`/stores/${targetStoreId}/featured-requests`);
  },

  async createByStore(
    payload: { productId: string; durationUnit: 'DAY' | 'WEEK' | 'MONTH'; paymentMethod?: 'PIX' | 'CREDIT_CARD'; publicNote?: string },
    storeId?: string
  ) {
    const targetStoreId = String(storeId || resolveStoreIdFromSession() || '').trim();
    if (!targetStoreId) throw new Error('Sessão de loja inválida');
    return apiClient.post(`/stores/${targetStoreId}/featured-requests`, payload);
  },

  async cancelByStore(requestId: string, storeId?: string) {
    const targetStoreId = String(storeId || resolveStoreIdFromSession() || '').trim();
    if (!targetStoreId) throw new Error('Sessão de loja inválida');
    return apiClient.patch(`/stores/${targetStoreId}/featured-requests/${requestId}/cancel`, {});
  },

  async refreshPaymentByStore(requestId: string, storeId?: string) {
    const targetStoreId = String(storeId || resolveStoreIdFromSession() || '').trim();
    if (!targetStoreId) throw new Error('Sessão de loja inválida');
    return apiClient.patch(`/stores/${targetStoreId}/featured-requests/${requestId}/refresh-payment`, {});
  },

  async getPaymentAuditByStore(requestId: string, storeId?: string) {
    const targetStoreId = String(storeId || resolveStoreIdFromSession() || '').trim();
    if (!targetStoreId) throw new Error('Sessão de loja inválida');
    return apiClient.get(`/stores/${targetStoreId}/featured-requests/${requestId}/payment-audit`);
  },

  async listPublicFeatured(limit = 18) {
    const response = await apiClient.rawGet(`/public/featured-products?limit=${Math.max(1, Math.min(60, Number(limit || 18)))}`);
    return toJson(response);
  },
};
