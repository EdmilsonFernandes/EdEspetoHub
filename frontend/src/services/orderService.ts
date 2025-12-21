import { apiClient } from "../config/apiClient";

const POLLING_INTERVAL = 4000;

const isUuid = (value: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);
const buildOrdersPath = (identifier: string) =>
    isUuid(identifier)
        ? `/stores/${identifier}/orders`
        : `/stores/slug/${identifier}/orders`;

const normalizeOrder = (order: any) => ({
    ...order,
    id: order.id ?? order.order_id ?? order.orderId,
});

export const orderService = {
    async save(orderData: any, storeId: any) {
        const targetStore = storeId || apiClient.getOwnerId();
        await apiClient.post(buildOrdersPath(targetStore), orderData);
    },

    async fetchAll(storeId: any) {
        const targetStore = storeId || apiClient.getOwnerId();
        const data = await apiClient.get(buildOrdersPath(targetStore));
        return data.map(normalizeOrder);
    },

    subscribeAll(storeId: any, callback: any) {
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

    async fetchQueue(storeId: any) {
        const targetStore = storeId || apiClient.getOwnerId();
        const data = await apiClient.get(buildOrdersPath(targetStore));
        return data.map(normalizeOrder);
    },

    subscribeRecent(storeId: any, callback: any) {
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

    async updateStatus(id: string, status: string) {
        await apiClient.patch(`/orders/${id}/status`, { status });
    },

    async updateItems(id: string, items: any, total: number) {
        await apiClient.patch(`/orders/${id}`, { items, total });
    },
};
