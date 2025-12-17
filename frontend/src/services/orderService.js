import { apiClient } from "../config/apiClient";

const POLLING_INTERVAL = 4000;

const isUuid = (value) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);
const buildOrdersPath = (identifier) =>
    isUuid(identifier)
        ? `/stores/${identifier}/orders`
        : `/stores/slug/${identifier}/orders`;

const normalizeOrder = (order) => ({
    ...order,
    id: order.id ?? order.order_id ?? order.orderId,
});

export const orderService = {
    async save(orderData, storeId) {
        const targetStore = storeId || apiClient.getOwnerId();
        await apiClient.post(buildOrdersPath(targetStore), orderData);
    },

    async fetchAll(storeId) {
        const targetStore = storeId || apiClient.getOwnerId();
        const data = await apiClient.get(buildOrdersPath(targetStore));
        return data.map(normalizeOrder);
    },

    subscribeAll(storeId, callback) {
        let cancelled = false;
        const targetStore = storeId || apiClient.getOwnerId();

        const load = async () => {
            try {
                const data = await apiClient.get(buildOrdersPath(targetStore));
                if (!cancelled) {
                    callback(data.map(normalizeOrder));
                }
            } catch (error) {
                console.error("Erro ao carregar pedidos", error);
            }
        };

        load();
        const interval = setInterval(load, POLLING_INTERVAL);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    },

    async fetchQueue(storeId) {
        const targetStore = storeId || apiClient.getOwnerId();
        const data = await apiClient.get(buildOrdersPath(targetStore));
        return data.map(normalizeOrder);
    },

    subscribeRecent(storeId, callback) {
        let cancelled = false;
        const targetStore = storeId || apiClient.getOwnerId();

        const load = async () => {
            const data = await this.fetchQueue(targetStore);
            if (!cancelled) {
                callback(data);
            }
        };

        load();
        const interval = setInterval(load, POLLING_INTERVAL);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    },

    async updateStatus(id, status) {
        await apiClient.patch(`/orders/${id}/status`, { status });
    },

    async updateItems(id, items, total) {
        await apiClient.patch(`/orders/${id}`, { items, total });
    },
};
