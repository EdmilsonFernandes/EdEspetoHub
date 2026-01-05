import { apiClient } from "../config/apiClient";

const POLLING_INTERVAL = 4000;

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
  type: order.type ?? order.order_type,
  items: (order.items || []).map((item: any) => ({
    ...item,
    id: item.id ?? item.item_id ?? item.orderItemId,
    qty: item.qty ?? item.quantity ?? 0,
    name: item.name ?? item.product?.name,
    unitPrice:
      item.unitPrice ??
      item.product?.price ??
      (item.price && item.quantity ? Number(item.price) / Number(item.quantity) : item.price) ??
      0,
    price: item.price ?? item.product?.price ?? 0,
    productId: item.productId ?? item.product?.id,
  })),
});

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

    await apiClient.post(`/stores/slug/${storeSlug}/orders`, orderData);
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

    const data = await apiClient.get(buildOrdersPath(targetStore));
    return data.map(normalizeOrder);
  },

  async fetchQueue(storeId?: string)
  {
    const targetStore = resolveStoreIdentifier(storeId);
    if (!targetStore)
    {
      return Promise.reject(new Error("Sessão inválida"));
    }

    const data = await apiClient.get(buildOrdersPath(targetStore));
    return data.map(normalizeOrder);
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
        console.error("Erro ao carregar pedidos", error);
      }
    };

    load();
    const interval = setInterval(load, POLLING_INTERVAL);

    return () =>
    {
      cancelled = true;
      clearInterval(interval);
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
      const data = await apiClient.get(buildOrdersPath(targetStore));
      if (!cancelled) callback(data.map(normalizeOrder));
    };

    load();
    const interval = setInterval(load, POLLING_INTERVAL);

    return () =>
    {
      cancelled = true;
      clearInterval(interval);
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
    }));
    await apiClient.patch(`/orders/${id}`, { items: normalizedItems, total });
  },
};
