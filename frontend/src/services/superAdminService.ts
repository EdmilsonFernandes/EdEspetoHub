const resolveBaseUrl = () => {
  return import.meta.env.VITE_API_BASE_URL || '/api';
};

const API_BASE_URL = resolveBaseUrl();

const buildUrl = (path: string) => {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
};

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
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
};
