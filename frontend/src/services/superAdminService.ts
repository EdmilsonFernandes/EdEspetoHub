import { forceLogoutAndRedirect, isSessionAuthError } from '../utils/sessionRedirect';

const resolveBaseUrl = () => {
  return import.meta.env.VITE_API_BASE_URL || '/api';
};

const API_BASE_URL = resolveBaseUrl();

const buildUrl = (path: string) => {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
};

const handleResponse = async (response: Response, canAutoLogout = true) => {
  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    let payload: any = null;
    if (contentType.includes('application/json')) {
      payload = await response.json().catch(() => null);
    } else {
      const text = await response.text().catch(() => '');
      payload = text ? { message: text } : null;
    }
    const message = payload?.message || response.statusText || 'Falha na requisição';
    const error: any = new Error(message);
    error.status = response.status;
    if (payload?.code) error.code = payload.code;
    if (payload?.details) error.details = payload.details;

    if (canAutoLogout && isSessionAuthError(response.status, message, payload?.code || '')) {
      forceLogoutAndRedirect('superadmin');
    }

    throw error;
  }
  return response.json();
};

export const superAdminService = {
  async login(email: string, password: string) {
    const response = await fetch(buildUrl('/auth/super-login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(response);
  },
  async fetchOverview(token: string) {
    const response = await fetch(buildUrl('/admin/overview'), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse(response);
  },
  async broadcastPush(
    token: string,
    payload: { title: string; body: string; url?: string; topic?: string; limit?: number }
  ) {
    const response = await fetch(buildUrl('/admin/push/broadcast'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload || {}),
    });
    return handleResponse(response);
  },
  async fetchPaymentEvents(token: string, paymentId?: string, limit = 50, offset = 0, storeId?: string) {
    const params = new URLSearchParams();
    if (paymentId) params.set('paymentId', paymentId);
    if (storeId) params.set('storeId', storeId);
    if (limit) params.set('limit', String(limit));
    if (offset) params.set('offset', String(offset));
    const response = await fetch(buildUrl(`/admin/payment-events?${params.toString()}`), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse(response);
  },
  async fetchPaymentEventsByStore(token: string, storeId: string, limit = 50) {
    const params = new URLSearchParams();
    params.set('storeId', storeId);
    if (limit) params.set('limit', String(limit));
    const response = await fetch(buildUrl(`/admin/payment-events?${params.toString()}`), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse(response);
  },
  async fetchAccessLogs(token: string, filters: Record<string, string> = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (!value) return;
      params.set(key, value);
    });
    const response = await fetch(buildUrl(`/admin/access-logs?${params.toString()}`), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse(response);
  },
  async reprocessPayment(token: string, paymentId: string, providerId?: string) {
    const response = await fetch(buildUrl(`/admin/payments/${paymentId}/reprocess`), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(providerId ? { providerId } : {}),
    });
    return handleResponse(response);
  },
  async updatePlanExempt(token: string, storeId: string, payload: { planExempt: boolean; planExemptLabel?: string }) {
    const response = await fetch(buildUrl(`/admin/stores/${storeId}/plan-exempt`), {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse(response, false);
  },

  async fetchMotoboyKycPending(token: string) {
    const response = await fetch(buildUrl('/admin/motoboys/kyc/pending'), {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(response);
  },

  async fetchMotoboyKycAudit(token: string, days = 30) {
    const response = await fetch(buildUrl(`/admin/motoboys/kyc/audit?days=${days}`), {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(response);
  },

  async fetchMotoboyKycReviews(token: string, limit = 30) {
    const response = await fetch(buildUrl(`/admin/motoboys/kyc/reviews?limit=${limit}`), {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(response);
  },

  async fetchMotoboyDocuments(token: string, motoboyId: string) {
    const response = await fetch(buildUrl(`/admin/motoboys/${motoboyId}/documents`), {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(response);
  },

  async approveMotoboyDocument(token: string, motoboyId: string, documentId: string) {
    const response = await fetch(buildUrl(`/admin/motoboys/${motoboyId}/documents/${documentId}/approve`), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    return handleResponse(response);
  },

  async rejectMotoboyDocument(token: string, motoboyId: string, documentId: string, reason?: string | null) {
    const response = await fetch(buildUrl(`/admin/motoboys/${motoboyId}/documents/${documentId}/reject`), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason || null }),
    });
    return handleResponse(response);
  },

  async fetchFeaturedRequests(token: string, filters: { status?: string; storeId?: string; limit?: number } = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', String(filters.status));
    if (filters.storeId) params.set('storeId', String(filters.storeId));
    if (filters.limit != null) params.set('limit', String(filters.limit));
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(buildUrl(`/admin/featured-requests${suffix}`), {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(response);
  },

  async reviewFeaturedRequest(
    token: string,
    requestId: string,
    payload: {
      status: 'APPROVED' | 'REJECTED';
      durationDays?: number;
      startsAt?: string;
      priceAmount?: number;
      paymentStatus?: 'PENDING' | 'PAID';
      adminNote?: string;
    }
  ) {
    const response = await fetch(buildUrl(`/admin/featured-requests/${requestId}/review`), {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
    });
    return handleResponse(response);
  },
};
