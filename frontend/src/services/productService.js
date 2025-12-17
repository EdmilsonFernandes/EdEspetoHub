import { apiClient } from "../config/apiClient";

const POLLING_INTERVAL = 4000;

const normalizeProduct = (product) => ({
    ...product,
    id: product.id ?? product.product_id ?? product.productId,
    imageUrl: product.image_url ?? product.imageUrl ?? "",
});

export const productService = {
    async save(product) {
        const storeId = apiClient.getOwnerId();
        if (product.id) {
            await apiClient.put(`/stores/${storeId}/products/${product.id}`, product);
        } else {
            await apiClient.post(`/stores/${storeId}/products`, product);
        }
    },
    async delete(id) {
        const storeId = apiClient.getOwnerId();
        await apiClient.delete(`/stores/${storeId}/products/${id}`);
    },
    subscribe(callback) {
        let cancelled = false;
        const storeId = apiClient.getOwnerId();

        const load = async () => {
            try {
                const data = await apiClient.get(`/stores/${storeId}/products`);
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
