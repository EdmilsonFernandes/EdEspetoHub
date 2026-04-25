import { apiClient } from '../config/apiClient';

const toJson = async (response: any) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.message || error?.error || 'Não conseguimos buscar o CEP agora.');
  }
  return response.json();
};

export const addressLookupService = {
  async lookupZipCode(zipCode: string) {
    const normalized = String(zipCode || '').replace(/\D/g, '').slice(0, 8);
    if (normalized.length !== 8) {
      throw new Error('CEP inválido.');
    }
    const response = await apiClient.rawGet(`/public/addresses/lookup-zip-code/${normalized}`);
    return toJson(response);
  },
};
