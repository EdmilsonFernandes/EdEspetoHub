import { apiClient } from "../config/apiClient";
import { normalizeProductModifiers } from "../utils/productModifiers";

const ORDER_FEED_TIMEOUT_MS = 8000;

const isUuid = (value: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);

const buildOrdersPath = (identifier: string) =>
  isUuid(identifier)
    ? `/stores/${identifier}/orders`
    : `/stores/slug/${identifier}/orders`;

const buildQueuePath = (identifier: string) =>
  isUuid(identifier)
    ? `/stores/${identifier}/orders/queue`
    : `/stores/slug/${identifier}/orders/queue`;

const normalizeOrder = (order: any) => ({
  ...order,
  id: order.id ?? order.order_id ?? order.orderId,
  createdAt: order.createdAt
    ? new Date(order.createdAt).getTime()
    : order.created_at
    ? new Date(order.created_at).getTime()
    : order.createdAt,
  updatedAt: order.updatedAt
    ? new Date(order.updatedAt).getTime()
    : order.updated_at
    ? new Date(order.updated_at).getTime()
    : order.updatedAt || null,
  payment: order.payment ?? order.paymentMethod ?? order.payment_method,
  cashTendered: order.cashTendered ?? order.cash_tendered ?? null,
  deliveryFee: order.deliveryFee ?? order.delivery_fee ?? null,
  paymentStatus: order.paymentStatus ?? order.payment_status ?? 'PENDING',
  fulfillmentMode: order.fulfillmentMode ?? order.fulfillment_mode ?? 'distance',
  condominiumOrder: order.condominiumOrder ?? order.condominium_order ?? (
    order.condominiumId || order.condominium_id || order.condominiumName || order.condominium_name
      ? {
          condominiumId: order.condominiumId ?? order.condominium_id ?? null,
          eventId: order.condominiumEventId ?? order.condominium_event_id ?? null,
          condominiumName: order.condominiumName ?? order.condominium_name ?? null,
          eventTitle: order.condominiumEventTitle ?? order.condominium_event_title ?? null,
          fulfillmentMode: order.condominiumFulfillmentMode ?? order.condominium_fulfillment_mode ?? null,
          unit: order.condominiumUnit ?? order.condominium_unit ?? null,
        }
      : null
  ),
  condominiumId: order.condominiumId ?? order.condominium_id ?? null,
  condominiumEventId: order.condominiumEventId ?? order.condominium_event_id ?? null,
  condominiumName: order.condominiumName ?? order.condominium_name ?? null,
  condominiumEventTitle: order.condominiumEventTitle ?? order.condominium_event_title ?? null,
  condominiumFulfillmentMode: order.condominiumFulfillmentMode ?? order.condominium_fulfillment_mode ?? null,
  condominiumUnit: order.condominiumUnit ?? order.condominium_unit ?? null,
  shipment: order.shipment
    ? {
        provider: order.shipment.provider ?? null,
        serviceCode: order.shipment.serviceCode ?? order.shipment.service_code ?? null,
        serviceName: order.shipment.serviceName ?? order.shipment.service_name ?? null,
        trackingCode: order.shipment.trackingCode ?? order.shipment.tracking_code ?? null,
        trackingUrl: order.shipment.trackingUrl ?? order.shipment.tracking_url ?? null,
        shipmentStatus: order.shipment.shipmentStatus ?? order.shipment.shipment_status ?? null,
        postedAt: order.shipment.postedAt ?? order.shipment.posted_at ?? null,
        deliveredAt: order.shipment.deliveredAt ?? order.shipment.delivered_at ?? null,
      }
    : null,
  type: order.type ?? order.order_type,
  items: (order.items || []).map((item: any) => {
    const quantity = item.qty ?? item.quantity ?? 0;
    const computedUnit =
      item.unitPrice ??
      (item.price && quantity ? Number(item.price) / Number(quantity) : null) ??
      item.price ??
      null;
    const promoActive = item.promoActive ?? item.product?.promoActive ?? false;
    const promoPrice =
      item.promoPrice != null
        ? Number(item.promoPrice)
        : item.product?.promoPrice != null
        ? Number(item.product.promoPrice)
        : null;
    const originalPrice =
      item.originalPrice != null
        ? Number(item.originalPrice)
        : item.product?.price != null
        ? Number(item.product.price)
        : null;
    return {
      ...item,
      id: item.id ?? item.item_id ?? item.orderItemId,
      qty: quantity,
      name: item.name ?? item.product?.name,
      isPrinted: Boolean(item.isPrinted ?? item.is_printed ?? false),
      cookingPoint: item.cookingPoint ?? item.cooking_point,
      passSkewer: item.passSkewer ?? item.pass_skewer ?? false,
      selectedModifiers: normalizeProductModifiers(item.selectedModifiers ?? item.selected_modifiers ?? []),
      promoActive,
      promoPrice,
      originalPrice,
      unitPrice: Number(computedUnit ?? 0),
      price: item.price ?? item.product?.price ?? 0,
      productId: item.productId ?? item.product?.id,
    };
  }),
});

const handleSessionError = (error: any) => {
  const status = Number(error?.status || 0);
  const code = String(error?.code || '').toUpperCase();
  const message = String(error?.message || '').toLowerCase();
  const shouldInvalidate =
    status === 401 ||
    [ 'AUTH-001', 'AUTH-002', 'AUTH-007' ].includes(code) ||
    message.includes('token inválido') ||
    message.includes('jwt');
  if (shouldInvalidate) {
    localStorage.removeItem('adminSession');
    if (typeof window !== 'undefined') {
      window.location.href = '/admin';
    }
  }
};

// 🔐 recupera store da sessão
const getStoreIdentifierFromSession = (): string | null =>
{
  const raw = localStorage.getItem("adminSession");
  if (!raw) return null;

  try
  {
    const parsed = JSON.parse(raw);
    return parsed?.store?.id || parsed?.store?.slug || null;
  } catch (error)
  {
    console.error("Sessão inválida na leitura da fila", error);
    localStorage.removeItem("adminSession");
    return null;
  }
};

const resolveStoreIdentifier = (storeId?: string): string | null =>
  storeId || getStoreIdentifierFromSession();

export const orderService = {
  async createBySlug(orderData: any, storeSlug: string)
  {
    if (!storeSlug)
    {
      return Promise.reject(new Error("Loja inválida"));
    }

    return apiClient.post(`/stores/slug/${storeSlug}/orders`, orderData);
  },
  async fetchHighlightsBySlug(storeSlug: string)
  {
    if (!storeSlug)
    {
      return Promise.reject(new Error("Loja inválida"));
    }
    return apiClient.get(`/public/stores/slug/${storeSlug}/highlights`);
  },
  async fetchTableStatusBySlug(storeSlug: string)
  {
    if (!storeSlug)
    {
      return Promise.reject(new Error("Loja inválida"));
    }
    return apiClient.get(`/public/stores/slug/${storeSlug}/tables/status`);
  },
  async save(orderData: any, storeId?: string)
  {
    const targetStore = resolveStoreIdentifier(storeId);
    if (!targetStore)
    {
      return Promise.reject(new Error("Sessão inválida"));
    }

    await apiClient.post(buildOrdersPath(targetStore), orderData);
  },

  async fetchAll(storeId?: string)
  {
    const targetStore = resolveStoreIdentifier(storeId);
    if (!targetStore)
    {
      return Promise.reject(new Error("Sessão inválida"));
    }

    try {
      const data = await apiClient.get(buildOrdersPath(targetStore), { timeoutMs: ORDER_FEED_TIMEOUT_MS });
      return data.map(normalizeOrder);
    } catch (error) {
      handleSessionError(error);
      throw error;
    }
  },

  async fetchQueue(storeId?: string)
  {
    const targetStore = resolveStoreIdentifier(storeId);
    if (!targetStore)
    {
      return Promise.reject(new Error("Sessão inválida"));
    }

    try {
      const data = await apiClient.get(buildQueuePath(targetStore), { timeoutMs: ORDER_FEED_TIMEOUT_MS });
      return data.map(normalizeOrder);
    } catch (error) {
      handleSessionError(error);
      throw error;
    }
  },

  subscribeAll(storeId: string | undefined, callback: any)
  {
    let cancelled = false;
    const targetStore = resolveStoreIdentifier(storeId);

    if (!targetStore)
    {
      console.error("Sessão inválida ao tentar inscrever pedidos");
      return () => {};
    }

    const load = async () =>
    {
      try
      {
        const data = await apiClient.get(buildOrdersPath(targetStore), { timeoutMs: ORDER_FEED_TIMEOUT_MS });
        if (!cancelled) callback(data.map(normalizeOrder));
      } catch (error)
      {
        handleSessionError(error);
        console.error("Erro ao carregar pedidos", error);
      }
    };

    load();

    return () =>
    {
      cancelled = true;
    };
  },

  subscribeRecent(storeId: string | undefined, callback: any)
  {
    let cancelled = false;
    const targetStore = resolveStoreIdentifier(storeId);

    if (!targetStore)
    {
      console.error("Sessão inválida ao tentar inscrever fila recente");
      return () => {};
    }

    const load = async () =>
    {
      try {
        const data = await apiClient.get(buildOrdersPath(targetStore), { timeoutMs: ORDER_FEED_TIMEOUT_MS });
        if (!cancelled) callback(data.map(normalizeOrder));
      } catch (error) {
        handleSessionError(error);
        console.error("Erro ao carregar pedidos", error);
      }
    };

    load();

    return () =>
    {
      cancelled = true;
    };
  },

  async updateStatus(id: string, status: string, payload?: { reason?: string })
  {
    await apiClient.patch(`/orders/${id}/status`, { status, ...(payload || {}) });
  },

  async updateFulfillmentMode(id: string, fulfillmentMode: 'distance' | 'postal') {
    return apiClient.patch(`/orders/${id}/fulfillment-mode`, { fulfillmentMode });
  },

  async updatePostalShipment(
    id: string,
    payload: {
      provider?: string;
      serviceCode?: string;
      serviceName?: string;
      trackingCode?: string;
      trackingUrl?: string;
      markPosted?: boolean;
    }
  ) {
    return apiClient.patch(`/orders/${id}/postal`, payload || {});
  },

  async updateItems(id: string, items: any, total: number)
  {
    const normalizedItems = (items || []).map((item: any) => ({
      productId: item.productId ?? item.product?.id ?? item.id,
      quantity: Number(item.qty ?? item.quantity ?? 0),
      isPrinted: Boolean(item.isPrinted),
      cookingPoint: item.cookingPoint,
      passSkewer: item.passSkewer,
      selectedModifiers: item.selectedModifiers,
    }));
    await apiClient.patch(`/orders/${id}`, { items: normalizedItems, total });
  },

  async reopenOrder(
    id: string,
    payload?: { reason?: string; adminIdentifier?: string; adminPassword?: string }
  ) {
    return apiClient.patch(`/orders/${id}/reopen`, payload || {});
  },

  async markItemsPrinted(id: string, itemIds?: string[]) {
    const normalized = Array.isArray(itemIds)
      ? itemIds.map((itemId) => String(itemId || '').trim()).filter(Boolean)
      : [];
    return apiClient.patch(`/orders/${id}/mark-as-printed`, { itemIds: normalized });
  },

  async getPublicById(orderId: string)
  {
    return apiClient.get(`/orders/${orderId}/public`);
  },

  async getTrackingV2(orderId: string) {
    return apiClient.get(`/v2/orders/${orderId}/tracking`);
  },

  async getReviewByOrder(orderId: string, accessToken?: string) {
    return apiClient.get(`/orders/${orderId}/review`, {
      headers: accessToken ? { 'X-Order-Access-Token': accessToken } : {},
    });
  },

  async submitReviewByOrder(orderId: string, payload: any, accessToken?: string) {
    return apiClient.post(`/orders/${orderId}/review`, payload, {
      headers: accessToken ? { 'X-Order-Access-Token': accessToken } : {},
    });
  },

  async listReviewsByStore(storeId: string, limit = 100) {
    return apiClient.get(`/stores/${storeId}/reviews?limit=${limit}`);
  },

  async getReviewSummaryByStore(storeId: string) {
    return apiClient.get(`/stores/${storeId}/reviews/summary`);
  },

  async listTipPayoutsByStore(storeId: string, limit = 300) {
    return apiClient.get(`/stores/${storeId}/reviews/tip-payouts?limit=${limit}`);
  },

  async markTipPayoutByStore(
    storeId: string,
    reviewId: string,
    payload: {
      payoutStatus?: 'PENDING' | 'PAID';
      payoutProofFile?: string | null;
      payoutProofUrl?: string | null;
      payoutNotes?: string | null;
    }
  ) {
    return apiClient.patch(`/stores/${storeId}/reviews/${reviewId}/tip-payout`, payload);
  },

  async listTipPayoutsForMotoboy(limit = 300) {
    return apiClient.get(`/motoboy/reviews/tip-payouts?limit=${limit}`);
  },
};
