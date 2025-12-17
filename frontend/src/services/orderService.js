import { apiClient } from "../config/apiClient";

const POLLING_INTERVAL = 4000;

const normalizeOrder = (order) => ({
    ...order,
    id: order.id ?? order.order_id ?? order.orderId,
});

export const orderService = {
    async save(orderData) {
        await apiClient.post("/orders", orderData);
    },

    subscribeAll(callback) {
        let cancelled = false;

        const load = async () => {
            try {
                const data = await apiClient.get("/orders");
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

    async fetchQueue() {
        const data = await apiClient.get("/orders/queue");
        return data.map(normalizeOrder);
    },

    subscribeRecent(callback) {
        let cancelled = false;

        const load = async () => {
            const data = await this.fetchQueue();
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
