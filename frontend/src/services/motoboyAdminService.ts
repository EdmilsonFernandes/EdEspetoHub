import { apiClient } from '../config/apiClient';

export const motoboyAdminService = {
  async list(storeId: string) {
    return apiClient.get(`/stores/${storeId}/motoboys`);
  },
  async create(storeId: string, payload: {
    userId?: string;
    email?: string;
    fullName?: string;
    phone?: string;
    username?: string;
    password?: string;
  }) {
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
  async listDocuments(storeId: string, motoboyId: string) {
    return apiClient.get(`/stores/${storeId}/motoboys/${motoboyId}/documents`);
  },
  async requestDocumentReupload(storeId: string, motoboyId: string, documentId: string, reason?: string | null) {
    return apiClient.post(`/stores/${storeId}/motoboys/${motoboyId}/documents/${documentId}/reupload`, { reason: reason || null });
  },
  async listRequests(storeId: string) {
    return apiClient.get(`/stores/${storeId}/motoboy-requests`);
  },
  async approveRequest(storeId: string, requestId: string) {
    return apiClient.post(`/stores/${storeId}/motoboy-requests/${requestId}/approve`, {});
  },
  async rejectRequest(storeId: string, requestId: string, reason?: string | null, rejectDocs?: string[] | null) {
    return apiClient.post(`/stores/${storeId}/motoboy-requests/${requestId}/reject`, {
      reason: reason || null,
      rejectDocs: Array.isArray(rejectDocs) ? rejectDocs : null,
    });
  },
};
