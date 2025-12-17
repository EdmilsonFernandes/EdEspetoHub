import { apiClient } from '../config/apiClient';

const toJson = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Erro ao comunicar com a loja');
  }
  return response.json();
};

export const storeService = {
  async create(payload) {
    const response = await apiClient.rawPost('/stores', payload);
    return toJson(response);
  },

  async fetchBySlug(slug) {
    if (!slug) return null;
    const response = await apiClient.rawGet(`/stores/${slug}`);
    if (response.status === 404) return null;
    return toJson(response);
  },

  async updateSettings(slug, payload) {
    const response = await apiClient.rawPut(`/stores/${slug}/settings`, payload);
    return toJson(response);
  },

  async setStatus(slug, isOpen) {
    const response = await apiClient.rawPatch(`/stores/${slug}/status`, { isOpen });
    return toJson(response);
  },
};
