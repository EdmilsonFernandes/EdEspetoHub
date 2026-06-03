export const STORE_CHECKOUT_DRAFT_TTL_MS = 12 * 60 * 60 * 1000;

export type StoreCheckoutDraftContext = 'public' | 'staff';

export type StoreCheckoutDraft = {
  version: 1;
  savedAt: number;
  context: StoreCheckoutDraftContext;
  cart: Record<string, any>;
  customer: Record<string, any>;
  paymentMethod: string;
  deliveryMode: string;
  selectedPostalServiceCode: string;
  view: string;
};

const normalizeContext = (context?: string | null): StoreCheckoutDraftContext =>
  String(context || '').toLowerCase() === 'staff' ? 'staff' : 'public';

export const buildStoreCheckoutDraftKey = (
  storeSlug?: string | null,
  context?: string | null
) => {
  const slug = String(storeSlug || '').trim() || 'default';
  return `storeCheckoutDraft:${slug}:${normalizeContext(context)}`;
};

export const getStoreCheckoutDraftItemCount = (cart: any) => {
  if (!cart || typeof cart !== 'object') return 0;
  return Object.values(cart).reduce((total: number, item: any) => {
    const qty = Math.max(0, Number(item?.qty || 0));
    return total + (Number.isFinite(qty) ? qty : 0);
  }, 0);
};

export const createStoreCheckoutDraft = (input: {
  cart: Record<string, any>;
  customer: Record<string, any>;
  paymentMethod?: string;
  deliveryMode?: string;
  selectedPostalServiceCode?: string;
  view?: string;
  context?: StoreCheckoutDraftContext;
  now?: number;
}): StoreCheckoutDraft | null => {
  if (getStoreCheckoutDraftItemCount(input.cart) <= 0) return null;

  return {
    version: 1,
    savedAt: Number(input.now || Date.now()),
    context: normalizeContext(input.context),
    cart: input.cart || {},
    customer: input.customer || {},
    paymentMethod: String(input.paymentMethod || ''),
    deliveryMode: String(input.deliveryMode || 'distance'),
    selectedPostalServiceCode: String(input.selectedPostalServiceCode || ''),
    view: String(input.view || 'cart'),
  };
};

export const normalizeStoreCheckoutDraft = (
  raw: unknown,
  now = Date.now()
): (StoreCheckoutDraft & { itemCount: number }) | null => {
  try {
    const draft = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!draft || typeof draft !== 'object') return null;

    const savedAt = Number((draft as any).savedAt || 0);
    if (!Number.isFinite(savedAt) || savedAt <= 0) return null;
    if (now - savedAt > STORE_CHECKOUT_DRAFT_TTL_MS) return null;

    const cart = (draft as any).cart;
    const itemCount = getStoreCheckoutDraftItemCount(cart);
    if (itemCount <= 0) return null;

    return {
      version: 1,
      savedAt,
      context: normalizeContext((draft as any).context),
      cart,
      customer: (draft as any).customer && typeof (draft as any).customer === 'object'
        ? (draft as any).customer
        : {},
      paymentMethod: String((draft as any).paymentMethod || ''),
      deliveryMode: String((draft as any).deliveryMode || 'distance'),
      selectedPostalServiceCode: String((draft as any).selectedPostalServiceCode || ''),
      view: String((draft as any).view || 'cart'),
      itemCount,
    };
  } catch {
    return null;
  }
};
