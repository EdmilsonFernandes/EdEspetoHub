import { apiClient } from '../config/apiClient';

export const motoboyAdminService = {
  async list(storeId: string) {
    return apiClient.get(`/stores/${storeId}/motoboys`);
  },
  async create(storeId: string, payload: { userId?: string; email?: string }) {
    return apiClient.post(`/stores/${storeId}/motoboys`, payload);
  },
  async link(storeId: string, motoboyId: string) {
    return apiClient.post(`/stores/${storeId}/motoboys/${motoboyId}/link`, {});
  },
  async unlink(storeId: string, motoboyId: string) {
    return apiClient.post(`/stores/${storeId}/motoboys/${motoboyId}/unlink`, {});
  },
  async approve(storeId: string, motoboyId: string) {
    return apiClient.post(`/stores/${storeId}/motoboys/${motoboyId}/approve`, {});
  },
  async suspend(storeId: string, motoboyId: string) {
    return apiClient.post(`/stores/${storeId}/motoboys/${motoboyId}/suspend`, {});
  },
};
