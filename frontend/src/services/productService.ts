import { apiClient } from "../config/apiClient";
import { resolveAssetUrl } from "../utils/resolveAssetUrl";
<<<<<<< HEAD
=======
import { normalizeProductModifiers } from "../utils/productModifiers";
>>>>>>> main

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
<<<<<<< HEAD
=======
    bundlePromoQty: product.bundlePromoQty ?? product.bundle_promo_qty ?? null,
    bundlePromoPrice: product.bundlePromoPrice ?? product.bundle_promo_price ?? null,
    bundlePromoActive: Boolean(product.bundlePromoActive ?? product.bundle_promo_active ?? false),
    manageStock: Boolean(product.manageStock ?? product.manage_stock ?? false),
    stockQuantity: Number(product.stockQuantity ?? product.stock_quantity ?? 0),
    lowStockAlert: Number(product.lowStockAlert ?? product.low_stock_alert ?? 3),
    active: product.active ?? product.is_active ?? true,
    availabilityDays: product.availabilityDays ?? product.availability_days ?? null,
    modifiers: normalizeProductModifiers(product.modifiers ?? product.modifiers_json ?? []),
    categoryPriority: Number(product.categoryPriority ?? product.category_priority ?? 99),
>>>>>>> main
    description,
    desc: description,
  };
};

const handleSessionError = (error: any) => {
<<<<<<< HEAD
  const message = (error?.message || '').toString();
  if (!message) return;
  if (
    message.includes('Token') ||
    message.includes('Sessão') ||
    message.includes('Loja não encontrada') ||
    message.includes('Sem permissão')
  ) {
=======
  const status = Number(error?.status || 0);
  const code = String(error?.code || '').toUpperCase();
  const message = String(error?.message || '').toLowerCase();
  const shouldInvalidate =
    status === 401 ||
    [ 'AUTH-001', 'AUTH-002', 'AUTH-007' ].includes(code) ||
    message.includes('token inválido') ||
    message.includes('jwt');
  if (shouldInvalidate) {
>>>>>>> main
    localStorage.removeItem('adminSession');
    if (typeof window !== 'undefined') {
      window.location.href = '/admin';
    }
  }
};

<<<<<<< HEAD
// 🔐 fonte única da loja (admin/churrasqueiro)
=======
// 🔐 fonte única da loja (admin/produção)
>>>>>>> main
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
<<<<<<< HEAD
      await apiClient.put(path, product);
    } else
    {
      await apiClient.post(basePath, product);
=======
      const data = await apiClient.put(path, product);
      return data ? normalizeProduct(data) : null;
    } else
    {
      const data = await apiClient.post(basePath, product);
      return data ? normalizeProduct(data) : null;
>>>>>>> main
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
<<<<<<< HEAD
    const data = await apiClient.get(`/stores/slug/${slug}/products`);
    return data.map(normalizeProduct);
  },

=======
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

>>>>>>> main
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
