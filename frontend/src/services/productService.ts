import { apiClient } from "../config/apiClient";
import { resolveAssetUrl } from "../utils/resolveAssetUrl";
import { normalizeProductModifiers } from "../utils/productModifiers";

const isUuid = (value: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);

const buildProductsPath = (identifier: string) =>
  isUuid(identifier)
    ? `/stores/${identifier}/products`
    : `/stores/slug/${identifier}/products`;

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
      return data ? normalizeProduct(data) : null;
    } else
    {
      const data = await apiClient.post(basePath, product);
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
      return data.map(normalizeProduct);
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

  async listPublicBySlug(slug: string)
  {
    const data = await apiClient.get(`/public/stores/slug/${slug}/products`);
    return data.map(normalizeProduct);
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
    return apiClient.get(`/public/stores/slug/${slug}/categories`);
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
          callback(data.map(normalizeProduct));
        }
      } catch (error)
      {
        handleSessionError(error);
        console.error("Erro ao carregar produtos", error);
      }
    };

    load();

    return () =>
    {
      cancelled = true;
    };
  },
};
