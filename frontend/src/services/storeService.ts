import { apiClient } from '../config/apiClient';

const toJson = async (response: any) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.error || 'Erro ao comunicar com a loja');
  }
  return response.json();
};

export const storeService = {
  async create(payload: any) {
    const response = await apiClient.rawPost('/auth/register', payload);
    return toJson(response);
  },

  async fetchBySlug(slug: any) {
    if (!slug) return null;
    const response = await apiClient.rawGet(`/stores/slug/${slug}`);
    if (response.status === 404) return null;
    return toJson(response);
  },

  async listPortfolio() {
    const response = await apiClient.rawGet('/public/stores');
    return toJson(response);
  },

  async updateSettings(slug: any, payload: any) {
    const response = await apiClient.rawPut(`/stores/${slug}/settings`, payload);
    return toJson(response);
  },

  async update(storeId: string, payload: any) {
    const response = await apiClient.rawPut(`/stores/${storeId}`, payload);
    return toJson(response);
  },

  async setStatus(storeId: any, isOpen: any) {
    const response = await apiClient.rawPut(`/stores/${storeId}/status`, { open: isOpen });
    return toJson(response);
  },
};
