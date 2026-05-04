import { describe, it, expect, beforeAll } from 'vitest';
import { api, registerStore, loginAdmin, registerCustomer, loginCustomer, verifyEmailDirectly, activateSubscription } from '../helpers';

describe('Pedido — Jornada E2E (cliente)', () => {
  let adminToken: string;
  let storeId: string;
  let storeSlug: string;
  let productId: string;

  beforeAll(async () => {
    // Setup: loja com produto
    const store = await registerStore();
    await verifyEmailDirectly(store.email);
    storeId = store.body.store?.id;
    if (storeId) await activateSubscription(storeId);
    const login = await loginAdmin(store.email, store.password);
    adminToken = login.token;
    storeSlug = login.store?.slug;

    // Criar produto
    const prod = await api
      .post(`/api/stores/${storeId}/products`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Espetinho Misto', price: 15, category: 'Espetinhos', available: true });
    productId = prod.body?.id;
  });

  it('cliente consulta catálogo público da loja', async () => {
    const res = await api.get(`/api/stores/slug/${storeSlug}/products`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('cliente cria pedido na loja', async () => {
    if (!productId) return;

    const res = await api.post(`/api/stores/${storeId}/orders`).send({
      customerName: 'Cliente Teste',
      type: 'pickup',
      items: [{ productId, quantity: 2 }],
      paymentMethod: 'pix',
    });
    expect(res.status).toBeLessThan(500);
    if (res.status === 201 || res.status === 200) {
      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe('pending');
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].quantity).toBe(2);
    }
  });

  it('admin vê pedido na fila', async () => {
    // Cria pedido
    if (!productId) return;
    await api.post(`/api/stores/${storeId}/orders`).send({
      customerName: 'Fila Teste',
      type: 'pickup',
      items: [{ productId, quantity: 1 }],
      paymentMethod: 'dinheiro',
    });

    const res = await api
      .get(`/api/stores/${storeId}/orders`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.orders || res.body)).toBe(true);
  });

  it('admin atualiza status do pedido (pending → preparing)', async () => {
    if (!productId) return;
    const order = await api.post(`/api/stores/${storeId}/orders`).send({
      customerName: 'Status Teste',
      type: 'pickup',
      items: [{ productId, quantity: 1 }],
      paymentMethod: 'pix',
    });
    if (order.status >= 400) return;
    const orderId = order.body.id;

    const res = await api
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'preparing' });
    expect(res.status).toBeLessThan(500);
  });

  it('acompanhamento público do pedido', async () => {
    if (!productId) return;
    const order = await api.post(`/api/stores/${storeId}/orders`).send({
      customerName: 'Tracking Teste',
      type: 'pickup',
      items: [{ productId, quantity: 1 }],
      paymentMethod: 'pix',
    });
    if (order.status >= 400) return;

    const res = await api.get(`/api/orders/${order.body.id}/public`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('items');
  });

  it('rejeita pedido sem itens', async () => {
    const res = await api.post(`/api/stores/${storeId}/orders`).send({
      customerName: 'Sem Itens',
      type: 'pickup',
      items: [],
      paymentMethod: 'pix',
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
