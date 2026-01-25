import { apiClient } from "../config/apiClient";

const isUuid = (value: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);

const buildOrdersPath = (identifier: string) =>
  isUuid(identifier)
    ? `/stores/${identifier}/orders`
    : `/stores/slug/${identifier}/orders`;

const normalizeOrder = (order: any) => ({
  ...order,
  id: order.id ?? order.order_id ?? order.orderId,
  createdAt: order.createdAt
    ? new Date(order.createdAt).getTime()
    : order.created_at
    ? new Date(order.created_at).getTime()
    : order.createdAt,
  payment: order.payment ?? order.paymentMethod ?? order.payment_method,
  cashTendered: order.cashTendered ?? order.cash_tendered ?? null,
  deliveryFee: order.deliveryFee ?? order.delivery_fee ?? null,
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
      cookingPoint: item.cookingPoint ?? item.cooking_point,
      passSkewer: item.passSkewer ?? item.pass_skewer ?? false,
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
  const message = (error?.message || '').toString();
  if (!message) return;
  if (
    message.includes('Token') ||
    message.includes('Sessão') ||
    message.includes('Loja não encontrada') ||
    message.includes('Sem permissão')
  ) {
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
      const data = await apiClient.get(buildOrdersPath(targetStore));
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
      const data = await apiClient.get(buildOrdersPath(targetStore));
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
        const data = await apiClient.get(buildOrdersPath(targetStore));
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
        const data = await apiClient.get(buildOrdersPath(targetStore));
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

  async updateStatus(id: string, status: string)
  {
    await apiClient.patch(`/orders/${id}/status`, { status });
  },

  async updateItems(id: string, items: any, total: number)
  {
    const normalizedItems = (items || []).map((item: any) => ({
      productId: item.productId ?? item.product?.id ?? item.id,
      quantity: Number(item.qty ?? item.quantity ?? 0),
      cookingPoint: item.cookingPoint,
      passSkewer: item.passSkewer,
    }));
    await apiClient.patch(`/orders/${id}`, { items: normalizedItems, total });
  },

  async getPublicById(orderId: string)
  {
    return apiClient.get(`/orders/${orderId}/public`);
  },
};
