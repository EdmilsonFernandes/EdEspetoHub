import { apiClient } from "../config/apiClient";
import { normalizeProductModifiers } from "../utils/productModifiers";

const ORDER_FEED_TIMEOUT_MS = 8000;
const PUBLIC_ORDER_CACHE_TTL_MS = 60_000;
const publicOrderCache = new Map<string, { data: any; expiresAt: number }>();
const publicOrderInflight = new Map<string, Promise<any>>();

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

type FetchOrdersOptions = {
  startDate?: string | null;
  endDate?: string | null;
  statuses?: string[];
};

const buildOrdersPathWithQuery = (identifier: string, options?: FetchOrdersOptions) => {
  const path = buildOrdersPath(identifier);
  const params = new URLSearchParams();
  const startDate = String(options?.startDate || '').trim();
  const endDate = String(options?.endDate || '').trim();
  const statuses = Array.isArray(options?.statuses)
    ? options.statuses.map((status) => String(status || '').trim()).filter(Boolean)
    : [];
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  if (statuses.length) params.set('statuses', statuses.join(','));
  const query = params.toString();
  return query ? `${path}?${query}` : path;
};

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
  onlinePayment: order.onlinePayment
    ? {
        ...order.onlinePayment,
        amount: order.onlinePayment.amount != null ? Number(order.onlinePayment.amount) : null,
        expiresAt: order.onlinePayment.expiresAt ?? null,
        paidAt: order.onlinePayment.paidAt ?? null,
        failedAt: order.onlinePayment.failedAt ?? null,
        updatedAt: order.onlinePayment.updatedAt ?? null,
        lastEventAt: order.onlinePayment.lastEventAt ?? null,
      }
    : null,
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
        quotePayload: order.shipment.quotePayload ?? order.shipment.quote_payload ?? null,
        estimatedDays: order.shipment.estimatedDays ?? order.shipment.estimated_days ?? null,
        postedAt: order.shipment.postedAt ?? order.shipment.posted_at ?? null,
        deliveredAt: order.shipment.deliveredAt ?? order.shipment.delivered_at ?? null,
        trackingLastEvent: order.shipment.trackingLastEvent ?? order.shipment.tracking_last_event ?? null,
        trackingLastAt: order.shipment.trackingLastAt ?? order.shipment.tracking_last_at ?? null,
        events: Array.isArray(order.shipment.events) ? order.shipment.events : [],
        trackingSummary: order.shipment.trackingSummary ?? order.shipment.tracking_summary ?? null,
        trackingProvider: order.shipment.trackingProvider ?? order.shipment.tracking_provider ?? null,
        trackingFallback: Boolean(order.shipment.trackingFallback ?? order.shipment.tracking_fallback ?? false),
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

const normalizePublicOrderCacheKey = (orderId: string) => String(orderId || '').trim();

const readPublicOrderCache = (orderId: string) => {
  const cacheKey = normalizePublicOrderCacheKey(orderId);
  if (!cacheKey) return null;
  const entry = publicOrderCache.get(cacheKey);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    publicOrderCache.delete(cacheKey);
    return null;
  }
  return entry.data;
};

const writePublicOrderCache = (orderId: string, data: any) => {
  const cacheKey = normalizePublicOrderCacheKey(orderId);
  if (!cacheKey || !data) return data;
  publicOrderCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + PUBLIC_ORDER_CACHE_TTL_MS,
  });
  return data;
};

const fetchPublicOrderById = async (orderId: string) => {
  const data = await apiClient.get(`/orders/${orderId}/public`);
  return writePublicOrderCache(orderId, data);
};

export const orderService = {
  /** Cupom: preview do desconto no checkout (público, por slug da loja) */
  async validateCouponBySlug(storeSlug: string, code: string, subtotal: number)
  {
    return apiClient.post(`/public/stores/slug/${storeSlug}/coupons/validate`, { code, subtotal }, { authMode: 'none' });
  },
  /** Cupom: quantos ativos a loja tem ("N cupons disponíveis") */
  async couponCountBySlug(storeSlug: string)
  {
    return apiClient.get(`/public/stores/slug/${storeSlug}/coupons/count`, { authMode: 'none' });
  },
  async createBySlug(
    orderData: any,
    storeSlug: string,
    options?: { authMode?: 'auto' | 'none' | 'admin' | 'customer' | 'motoboy'; timeoutMs?: number }
  )
  {
    if (!storeSlug)
    {
      return Promise.reject(new Error("Loja inválida"));
    }

    return apiClient.post(`/stores/slug/${storeSlug}/orders`, orderData, {
      authMode: options?.authMode || 'auto',
      ...(options?.timeoutMs ? { timeoutMs: options.timeoutMs } : {}),
    });
  },
  async fetchHighlightsBySlug(storeSlug: string)
  {
    if (!storeSlug)
    {
      return Promise.reject(new Error("Loja inválida"));
    }
    return apiClient.get(`/public/stores/slug/${storeSlug}/highlights`, { authMode: 'none' });
  },
  async fetchTableStatusBySlug(storeSlug: string)
  {
    if (!storeSlug)
    {
      return Promise.reject(new Error("Loja inválida"));
    }
    return apiClient.get(`/public/stores/slug/${storeSlug}/tables/status`, { authMode: 'none' });
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

  async fetchAll(storeId?: string, options?: FetchOrdersOptions)
  {
    const targetStore = resolveStoreIdentifier(storeId);
    if (!targetStore)
    {
      return Promise.reject(new Error("Sessão inválida"));
    }

    try {
      const data = await apiClient.get(buildOrdersPathWithQuery(targetStore, options), { timeoutMs: ORDER_FEED_TIMEOUT_MS });
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

  async reportDeliveryIssue(
    id: string,
    payload: {
      reason: string;
      details?: string | null;
      action?: string | null;
    }
  ) {
    return apiClient.post(`/deliveries/${id}/issues`, payload || {});
  },

  async resetDeliveryConfirmationCode(
    id: string,
    payload?: {
      reason?: string | null;
      details?: string | null;
    }
  ) {
    return apiClient.post(`/deliveries/${id}/confirmation-code/reset`, payload || {});
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
      unitPriceOverride: Number(
        item.unitPriceOverride ??
          item.unitPrice ??
          (item.price && (item.qty ?? item.quantity) ? Number(item.price) / Number(item.qty ?? item.quantity) : item.price) ??
          0
      ),
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

  /** Loja confirma recebimento de pagamento manual (pix_loja/dinheiro/presencial). */
  confirmManualPayment: async (id: string) => {
    return apiClient.patch(`/orders/${id}/confirm-payment`, {});
  },

  peekPublicById(orderId: string) {
    return readPublicOrderCache(orderId);
  },

  async prefetchPublicById(orderId: string) {
    const cacheKey = normalizePublicOrderCacheKey(orderId);
    if (!cacheKey) return null;
    const cached = readPublicOrderCache(cacheKey);
    if (cached) return cached;
    const inflight = publicOrderInflight.get(cacheKey);
    if (inflight) return inflight;
    const requestPromise = fetchPublicOrderById(cacheKey).finally(() => {
      publicOrderInflight.delete(cacheKey);
    });
    publicOrderInflight.set(cacheKey, requestPromise);
    return requestPromise;
  },

  clearPublicByIdCache(orderId?: string) {
    const cacheKey = normalizePublicOrderCacheKey(String(orderId || ''));
    if (!cacheKey) {
      publicOrderCache.clear();
      publicOrderInflight.clear();
      return;
    }
    publicOrderCache.delete(cacheKey);
    publicOrderInflight.delete(cacheKey);
  },

  async getPublicById(orderId: string, options?: { dedupe?: boolean })
  {
    const cacheKey = normalizePublicOrderCacheKey(orderId);
    if (!cacheKey) {
      return apiClient.get(`/orders/${orderId}/public`);
    }
    if (options?.dedupe !== false) {
      const inflight = publicOrderInflight.get(cacheKey);
      if (inflight) return inflight;
      const requestPromise = fetchPublicOrderById(cacheKey).finally(() => {
        publicOrderInflight.delete(cacheKey);
      });
      publicOrderInflight.set(cacheKey, requestPromise);
      return requestPromise;
    }
    return fetchPublicOrderById(cacheKey);
  },

  async getPaymentAudit(orderId: string, storeId?: string) {
    const targetStore = resolveStoreIdentifier(storeId);
    if (!targetStore) {
      return Promise.reject(new Error('Sessão inválida'));
    }
    return apiClient.get(`/stores/${targetStore}/orders/${orderId}/payment-audit`);
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

  async replyReviewByStore(storeId: string, reviewId: string, reply: string) {
    return apiClient.patch(`/stores/${storeId}/reviews/${reviewId}/reply`, { reply });
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
