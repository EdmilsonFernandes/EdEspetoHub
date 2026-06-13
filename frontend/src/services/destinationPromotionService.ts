import { apiClient } from '../config/apiClient';

const partnerAuth = { authMode: 'partner', skipAutoLogout: true } as const;

export type DestinationPromotionResourceType = 'HOSPITALITY_PLACE' | 'DESTINATION_LISTING' | 'DESTINATION';

export type DestinationPromotion = {
  id: string;
  resourceType: DestinationPromotionResourceType;
  resourceId: string;
  resourceName?: string | null;
  status: string;
  paymentStatus: string;
  durationUnit: 'DAY' | 'WEEK' | 'MONTH';
  durationDays: number;
  priceAmount?: number | null;
  paymentMethod: string;
  paymentLink?: string | null;
  paymentQrCodeBase64?: string | null;
  paymentQrCodeText?: string | null;
  paymentExpiresAt?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt: string;
};

const toJson = async (response: any) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.error || 'Falha ao processar destaque de destino');
  }
  return response.json();
};

export const destinationPromotionService = {
  /** Preços/vagas do destaque de destino (público ao parceiro autenticado). */
  async getPricing() {
    return apiClient.get('/destination-partner/promotions/pricing', partnerAuth);
  },

  async listMine() {
    return apiClient.get('/destination-partner/promotions', partnerAuth);
  },

  async create(payload: {
    resourceType: DestinationPromotionResourceType;
    resourceId: string;
    durationUnit: 'DAY' | 'WEEK' | 'MONTH';
    paymentMethod?: 'PIX' | 'CREDIT_CARD';
    publicNote?: string;
  }) {
    return apiClient.post('/destination-partner/promotions', payload, partnerAuth);
  },

  async refreshPayment(promotionId: string) {
    return apiClient.post(`/destination-partner/promotions/${promotionId}/refresh`, {}, partnerAuth);
  },

  async cancel(promotionId: string) {
    return apiClient.post(`/destination-partner/promotions/${promotionId}/cancel`, {}, partnerAuth);
  },

  /** Admin (Super Admin): lista promoções para revisão. */
  async listForAdmin(status?: string) {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    const response = await apiClient.rawGet(`/admin/destination-promotions${query}`);
    return toJson(response);
  },

  async reviewByAdmin(promotionId: string, payload: { status: 'APPROVED' | 'REJECTED'; adminNote?: string }) {
    return apiClient.patch(`/admin/destination-promotions/${promotionId}/review`, payload);
  },
};
