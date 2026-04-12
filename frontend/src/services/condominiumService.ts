import { apiClient } from '../config/apiClient';

const toJson = async (response: any) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.error || 'Erro ao carregar condominios');
  }
  return response.json();
};

export const condominiumService = {
  async listPublic() {
    const response = await apiClient.rawGet('/public/condominiums');
    return toJson(response);
  },

  async listStores(slug: string) {
    const response = await apiClient.rawGet(`/public/condominiums/${encodeURIComponent(slug)}/stores`);
    return toJson(response);
  },
};
