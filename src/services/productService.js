import { apiClient } from "../config/apiClient";

const POLLING_INTERVAL = 4000;

const normalizeProduct = (product) => ({
    ...product,
    id: product.id ?? product.product_id ?? product.productId,
});

export const productService = {
    async save(product) {
        if (product.id) {
            await apiClient.put(`/api/products/${product.id}`, product);
        } else {
            await apiClient.post("/api/products", product);
        }
    },
    async delete(id) {
        await apiClient.delete(`/api/products/${id}`);
    },
    subscribe(callback) {
        let cancelled = false;

        const load = async () => {
            try {
                const data = await apiClient.get("/api/products");
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
