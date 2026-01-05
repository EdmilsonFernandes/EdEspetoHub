import { apiClient } from "../config/apiClient";
import { resolveAssetUrl } from "../utils/resolveAssetUrl";

const POLLING_INTERVAL = 4000;

const isUuid = (value: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);

const buildProductsPath = (identifier: string) =>
  isUuid(identifier)
    ? `/stores/${identifier}/products`
    : `/stores/slug/${identifier}/products`;

const normalizeProduct = (product: any) => ({
  ...product,
  id: product.id ?? product.product_id ?? product.productId,
  imageUrl: resolveAssetUrl(product.image_url ?? product.imageUrl ?? ""),
});

// 🔐 fonte única da loja (admin/churrasqueiro)
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
      await apiClient.put(path, product);
    } else
    {
      await apiClient.post(basePath, product);
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

    const data = await apiClient.get(buildProductsPath(targetStore));
    return data.map(normalizeProduct);
  },

  async listBySlug(slug: string)
  {
    const data = await apiClient.get(`/stores/slug/${slug}/products`);
    return data.map(normalizeProduct);
  },

  async listPublicBySlug(slug: string)
  {
    const data = await apiClient.get(`/stores/slug/${slug}/products`);
    return data.map(normalizeProduct);
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
        console.error("Erro ao carregar produtos", error);
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
};
