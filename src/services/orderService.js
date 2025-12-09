import { apiClient } from '../config/apiClient';

const POLLING_INTERVAL = 4000;

const normalizeOrder = (order) => ({
  ...order,
  id: order.id ?? order.order_id ?? order.orderId
});

export const orderService = {
  async save(orderData) {
    await apiClient.post('/api/orders', orderData);
  },
  subscribeAll(callback) {
    let cancelled = false;

    const load = async () => {
      const data = await apiClient.get('/api/orders');
      if (!cancelled) {
        callback(data.map(normalizeOrder));
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
    const data = await apiClient.get('/api/orders/queue');
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
    await apiClient.patch(`/api/orders/${id}/status`, { status });
  }
};
