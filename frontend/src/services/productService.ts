import { apiClient } from "../config/apiClient";
import { resolveAssetUrl } from "../utils/resolveAssetUrl";
import { normalizeProductModifiers } from "../utils/productModifiers";

const isUuid = (value: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);

const buildProductsPath = (identifier: string) =>
  isUuid(identifier)
    ? `/stores/${identifier}/products`
    : `/stores/slug/${identifier}/products`;

const PRODUCT_CACHE_TTL_MS = 90 * 1000;
const PRODUCT_CACHE_KEY_PREFIX = 'products:catalog:';
const inMemoryProductCache = new Map<string, { ts: number; items: any[] }>();
const publicSlugProductCache = new Map<string, { ts: number; items: any[] }>();

const normalizeProduct = (product: any) => {
  const description = product.description ?? product.desc ?? "";
  return {
    ...product,
    id: product.id ?? product.product_id ?? product.productId,
    imageUrl: resolveAssetUrl(product.image_url ?? product.imageUrl ?? ""),
    promoPrice: product.promoPrice ?? product.promo_price ?? null,
    promoActive: Boolean(product.promoActive ?? product.promo_active ?? false),
    bundlePromoQty: product.bundlePromoQty ?? product.bundle_promo_qty ?? null,
    bundlePromoPrice: product.bundlePromoPrice ?? product.bundle_promo_price ?? null,
    bundlePromoActive: Boolean(product.bundlePromoActive ?? product.bundle_promo_active ?? false),
    manageStock: Boolean(product.manageStock ?? product.manage_stock ?? false),
    stockQuantity: Number(product.stockQuantity ?? product.stock_quantity ?? 0),
    lowStockAlert: Number(product.lowStockAlert ?? product.low_stock_alert ?? 3),
    weightG: Number(product.weightG ?? product.weight_g ?? 0) || null,
    lengthCm: Number(product.lengthCm ?? product.length_cm ?? 0) || null,
    widthCm: Number(product.widthCm ?? product.width_cm ?? 0) || null,
    heightCm: Number(product.heightCm ?? product.height_cm ?? 0) || null,
    active: product.active ?? product.is_active ?? true,
    availabilityDays: product.availabilityDays ?? product.availability_days ?? null,
    modifiers: normalizeProductModifiers(product.modifiers ?? product.modifiers_json ?? []),
    categoryPriority: Number(product.categoryPriority ?? product.category_priority ?? 99),
    description,
    desc: description,
  };
};

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

const getProductCacheKey = (storeIdentifier: string) => `${PRODUCT_CACHE_KEY_PREFIX}${storeIdentifier}`;

const writeProductCache = (storeIdentifier: string, items: any[]) => {
  const payload = {
    ts: Date.now(),
    items: Array.isArray(items) ? items : [],
  };
  inMemoryProductCache.set(storeIdentifier, payload);
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(getProductCacheKey(storeIdentifier), JSON.stringify(payload));
  } catch {
    // ignore cache persistence failures
  }
};

const readProductCache = (storeIdentifier: string) => {
  const now = Date.now();
  const memory = inMemoryProductCache.get(storeIdentifier);
  if (memory && now - Number(memory.ts || 0) <= PRODUCT_CACHE_TTL_MS) {
    return memory.items;
  }

  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(getProductCacheKey(storeIdentifier));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const ts = Number(parsed?.ts || 0);
    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    if (!ts || now - ts > PRODUCT_CACHE_TTL_MS) {
      sessionStorage.removeItem(getProductCacheKey(storeIdentifier));
      inMemoryProductCache.delete(storeIdentifier);
      return null;
    }
    inMemoryProductCache.set(storeIdentifier, { ts, items });
    return items;
  } catch {
    return null;
  }
};

const invalidateProductCache = (storeIdentifier?: string | null) => {
  const normalized = String(storeIdentifier || '').trim();
  if (!normalized) return;
  inMemoryProductCache.delete(normalized);
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(getProductCacheKey(normalized));
  } catch {
    // ignore
  }
};

const getPublicProductCacheKey = (slug: string) => `${PRODUCT_CACHE_KEY_PREFIX}public:${String(slug || '').trim().toLowerCase()}`;

const readPublicProductCache = (slug: string) => {
  const normalizedSlug = String(slug || '').trim().toLowerCase();
  if (!normalizedSlug) return null;
  const now = Date.now();
  const memory = publicSlugProductCache.get(normalizedSlug);
  if (memory && now - Number(memory.ts || 0) <= PRODUCT_CACHE_TTL_MS) {
    return memory.items;
  }

  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(getPublicProductCacheKey(normalizedSlug));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const ts = Number(parsed?.ts || 0);
    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    if (!ts || now - ts > PRODUCT_CACHE_TTL_MS) {
      sessionStorage.removeItem(getPublicProductCacheKey(normalizedSlug));
      publicSlugProductCache.delete(normalizedSlug);
      return null;
    }
    publicSlugProductCache.set(normalizedSlug, { ts, items });
    return items;
  } catch {
    return null;
  }
};

const writePublicProductCache = (slug: string, items: any[]) => {
  const normalizedSlug = String(slug || '').trim().toLowerCase();
  if (!normalizedSlug) return items;
  const payload = {
    ts: Date.now(),
    items: Array.isArray(items) ? items : [],
  };
  publicSlugProductCache.set(normalizedSlug, payload);
  if (typeof window === 'undefined') return items;
  try {
    sessionStorage.setItem(getPublicProductCacheKey(normalizedSlug), JSON.stringify(payload));
  } catch {
    // ignore cache persistence failures
  }
  return items;
};

// 🔐 fonte única da loja (admin/produção)
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
    console.error("Sessão inválida na leitura da loja", error);
    localStorage.removeItem("adminSession");
    return null;
  }
};

const resolveStoreIdentifier = (storeId?: string): string | null =>
  storeId || getStoreIdentifierFromSession();

export const productService = {
  async save(product: any, storeId?: string)
  {
    const targetStore = resolveStoreIdentifier(storeId);
    if (!targetStore)
    {
      return Promise.reject(new Error("Sessão inválida"));
    }

    const basePath = buildProductsPath(targetStore);
    const path = product.id ? `${basePath}/${product.id}` : basePath;

    if (product.id)
    {
      const data = await apiClient.put(path, product);
      invalidateProductCache(targetStore);
      return data ? normalizeProduct(data) : null;
    } else
    {
      const data = await apiClient.post(basePath, product);
      invalidateProductCache(targetStore);
      return data ? normalizeProduct(data) : null;
    }
  },

  async delete(id: string, storeId?: string)
  {
    const targetStore = resolveStoreIdentifier(storeId);
    if (!targetStore)
    {
      return Promise.reject(new Error("Sessão inválida"));
    }

    const basePath = buildProductsPath(targetStore);
    await apiClient.delete(`${basePath}/${id}`);
    invalidateProductCache(targetStore);
  },

  async list(storeId?: string)
  {
    const targetStore = resolveStoreIdentifier(storeId);
    if (!targetStore)
    {
      return Promise.reject(new Error("Sessão inválida"));
    }

    try {
      const data = await apiClient.get(buildProductsPath(targetStore));
      const normalized = data.map(normalizeProduct);
      writeProductCache(targetStore, normalized);
      return normalized;
    } catch (error) {
      handleSessionError(error);
      throw error;
    }
  },

  async listBySlug(slug: string)
  {
    const data = await apiClient.get(`/stores/slug/${slug}/products`);
    return data.map(normalizeProduct);
  },

  async listPublicBySlug(slug: string, options?: { forceRefresh?: boolean })
  {
    const cached = options?.forceRefresh ? null : readPublicProductCache(slug);
    if (cached) return cached;
    const suffix = options?.forceRefresh ? `?t=${Date.now()}` : '';
    const data = await apiClient.get(`/public/stores/slug/${slug}/products${suffix}`, {
      authMode: 'none',
      ...(options?.forceRefresh ? { headers: { 'Cache-Control': 'no-cache' } } : {}),
    });
    const normalized = data.map(normalizeProduct);
    return writePublicProductCache(slug, normalized);
  },

  async listCategories(storeId?: string) {
    const targetStore = resolveStoreIdentifier(storeId);
    if (!targetStore) return Promise.reject(new Error('Sessão inválida'));
    const path = isUuid(targetStore)
      ? `/stores/${targetStore}/categories`
      : `/stores/slug/${targetStore}/categories`;
    return apiClient.get(path);
  },

  async listPublicCategoriesBySlug(slug: string) {
    return apiClient.get(`/public/stores/slug/${slug}/categories`, { authMode: 'none' });
  },

  async setCategoryPriority(name: string, priority: number, storeId?: string) {
    const targetStore = resolveStoreIdentifier(storeId);
    if (!targetStore || !isUuid(targetStore)) return Promise.reject(new Error('Sessão inválida'));
    return apiClient.patch(`/stores/${targetStore}/categories/priority`, { name, priority });
  },

  async listInventory(
    params?: { status?: string; query?: string; includeNotManaged?: boolean; limit?: number; offset?: number },
    storeId?: string
  ) {
    const targetStore = resolveStoreIdentifier(storeId);
    if (!targetStore || !isUuid(targetStore)) return Promise.reject(new Error('Sessão inválida'));
    const query = new URLSearchParams();
    if (params?.status) query.set('status', String(params.status));
    if (params?.query) query.set('query', String(params.query));
    if (params?.includeNotManaged !== undefined) query.set('includeNotManaged', String(Boolean(params.includeNotManaged)));
    if (params?.limit !== undefined) query.set('limit', String(params.limit));
    if (params?.offset !== undefined) query.set('offset', String(params.offset));
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return apiClient.get(`/stores/${targetStore}/inventory${suffix}`);
  },

  async getInventoryAlerts(storeId?: string) {
    const targetStore = resolveStoreIdentifier(storeId);
    if (!targetStore || !isUuid(targetStore)) return Promise.reject(new Error('Sessão inválida'));
    return apiClient.get(`/stores/${targetStore}/inventory/alerts`);
  },

  async listInventoryMovements(
    params?: { productId?: string; limit?: number; offset?: number },
    storeId?: string
  ) {
    const targetStore = resolveStoreIdentifier(storeId);
    if (!targetStore || !isUuid(targetStore)) return Promise.reject(new Error('Sessão inválida'));
    const query = new URLSearchParams();
    if (params?.productId) query.set('productId', String(params.productId));
    if (params?.limit !== undefined) query.set('limit', String(params.limit));
    if (params?.offset !== undefined) query.set('offset', String(params.offset));
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return apiClient.get(`/stores/${targetStore}/inventory/movements${suffix}`);
  },

  async adjustStock(
    productId: string,
    payload: { mode: 'in' | 'out' | 'set'; quantity: number; reason?: string; lowStockAlert?: number; manageStock?: boolean },
    storeId?: string
  ) {
    const targetStore = resolveStoreIdentifier(storeId);
    if (!targetStore || !isUuid(targetStore)) return Promise.reject(new Error('Sessão inválida'));
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const data = await apiClient.patch(
          `/stores/${targetStore}/products/${productId}/stock`,
          payload,
          { signal: controller.signal }
        );
        invalidateProductCache(targetStore);
        return normalizeProduct(data);
      } catch (error: any) {
        const isAbort = String(error?.name || '').toLowerCase() === 'aborterror';
        if (isAbort) {
          throw new Error('A operação demorou demais. Tente novamente.');
        }
        const status = Number(error?.status || 0);
        if (status !== 409 || attempt >= maxAttempts) throw error;
        await wait(140 * attempt);
      } finally {
        clearTimeout(timeout);
      }
    }
    throw new Error('Não foi possível ajustar o estoque agora.');
  },

  subscribe(callback: any, storeId?: string)
  {
    let cancelled = false;
    const targetStore = resolveStoreIdentifier(storeId);

    if (!targetStore)
    {
      console.error("Sessão inválida ao tentar inscrever produtos");
      return () => {};
    }

    const basePath = buildProductsPath(targetStore);

    const load = async () =>
    {
      try
      {
        const data = await apiClient.get(basePath);
        if (!cancelled)
        {
          const normalized = data.map(normalizeProduct);
          writeProductCache(targetStore, normalized);
          callback(normalized);
        }
      } catch (error)
      {
        handleSessionError(error);
        console.error("Erro ao carregar produtos", error);
      }
    };

    const cached = readProductCache(targetStore);
    if (cached && !cancelled) {
      callback(cached);
    }
    load();

    return () =>
    {
      cancelled = true;
    };
  },
};
