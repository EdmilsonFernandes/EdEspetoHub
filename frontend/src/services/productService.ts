import { apiClient } from "../config/apiClient";

const POLLING_INTERVAL = 4000;

const isUuid = (value: any) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);
const buildProductsPath = (identifier: any) =>
    isUuid(identifier)
        ? `/stores/${identifier}/products`
        : `/stores/slug/${identifier}/products`;

const normalizeProduct = (product: any) => ({
    ...product,
    id: product.id ?? product.product_id ?? product.productId,
    imageUrl: product.image_url ?? product.imageUrl ?? "",
});

export const productService = {
    async save(product: any) {
        const storeId = apiClient.getOwnerId();
        const basePath = buildProductsPath(storeId);
        const path = product.id ? `${basePath}/${product.id}` : basePath;

        if (product.id) {
            await apiClient.put(path, product);
        } else {
            await apiClient.post(basePath, product);
        }
    },
    async delete(id: any) {
        const storeId = apiClient.getOwnerId();
        const basePath = buildProductsPath(storeId);
        await apiClient.delete(`${basePath}/${id}`);
    },
    async listBySlug(slug: any) {
        const data = await apiClient.get(`/stores/slug/${slug}/products`);
        return data.map(normalizeProduct);
    },

    subscribe(callback: any) {
        let cancelled = false;
        const storeId = apiClient.getOwnerId();
        const basePath = buildProductsPath(storeId);

        const load = async () => {
            try {
                const data = await apiClient.get(basePath);
                if (!cancelled) {
                    callback(data.map(normalizeProduct));
                }
            } catch (error) {
                console.error("Erro ao carregar produtos", error);
            }
        };

        load();
        const interval = setInterval(load, POLLING_INTERVAL);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    },
};
