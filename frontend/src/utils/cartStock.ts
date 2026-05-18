export type CartStockItem = {
  id?: string;
  productId?: string;
  key?: string;
  name?: string;
  qty?: number;
  manageStock?: boolean;
  stockQuantity?: number;
  lowStockAlert?: number;
  active?: boolean;
  [key: string]: any;
};

export type CartStockProduct = {
  id?: string;
  productId?: string;
  name?: string;
  manageStock?: boolean;
  stockQuantity?: number;
  lowStockAlert?: number;
  active?: boolean;
  [key: string]: any;
};

type CartStockResult = {
  ok: boolean;
  changed: boolean;
  nextCart: Record<string, CartStockItem>;
  message: string;
};

const normalizePositiveInt = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
};

const getProductId = (value: CartStockItem | CartStockProduct | null | undefined) =>
  String(value?.id || value?.productId || '').trim();

const formatUnits = (qty: number) => `${qty} unidade${qty === 1 ? '' : 's'}`;

export const reconcileCartStock = (
  cart: Record<string, CartStockItem> | null | undefined,
  products: CartStockProduct[] | null | undefined
): CartStockResult => {
  const productMap = new Map<string, CartStockProduct>();
  (Array.isArray(products) ? products : []).forEach((product) => {
    const productId = getProductId(product);
    if (productId) productMap.set(productId, product);
  });

  const remainingByProduct = new Map<string, number>();
  const nextCart: Record<string, CartStockItem> = {};
  let changed = false;
  let message = '';

  Object.entries(cart || {}).forEach(([key, entry]) => {
    const productId = getProductId(entry);
    const qty = normalizePositiveInt(entry?.qty);
    const product = productId ? productMap.get(productId) : null;
    const label = String(product?.name || entry?.name || 'Produto').trim();

    if (!productId || qty <= 0) {
      changed = true;
      return;
    }

    if (!product || product.active === false) {
      changed = true;
      if (!message) message = `${label} não está mais disponível no cardápio. Removi do carrinho.`;
      return;
    }

    const manageStock = Boolean(product.manageStock ?? entry.manageStock);
    const stockQuantity = normalizePositiveInt(product.stockQuantity ?? entry.stockQuantity);
    const syncedEntry = {
      ...entry,
      manageStock,
      stockQuantity,
      lowStockAlert: product.lowStockAlert ?? entry.lowStockAlert,
      active: product.active ?? entry.active,
    };

    if (!manageStock) {
      nextCart[key] = syncedEntry;
      return;
    }

    const remaining = remainingByProduct.has(productId)
      ? Number(remainingByProduct.get(productId) || 0)
      : stockQuantity;

    if (remaining <= 0) {
      changed = true;
      if (!message) message = `${label} está esgotado no momento. Removi do carrinho.`;
      remainingByProduct.set(productId, 0);
      return;
    }

    const allowedQty = Math.min(qty, remaining);
    remainingByProduct.set(productId, Math.max(0, remaining - allowedQty));

    if (allowedQty < qty) {
      changed = true;
      if (!message) message = `Só temos ${formatUnits(stockQuantity)} de ${label}. Ajustei seu carrinho.`;
    }

    if (allowedQty > 0) {
      nextCart[key] = {
        ...syncedEntry,
        qty: allowedQty,
      };
    }
  });

  return {
    ok: !changed,
    changed,
    nextCart,
    message,
  };
};
