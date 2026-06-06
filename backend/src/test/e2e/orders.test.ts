import { describe, it, expect, beforeAll } from 'vitest';
import { api, registerStore, loginAdmin, registerCustomer, loginCustomer, verifyEmailDirectly, activateSubscription, exemptStorePlan } from '../helpers';

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
    if (storeId) await exemptStorePlan(storeId, 'Postal tracking E2E');
    const login = await loginAdmin(store.email, store.password);
    adminToken = login.token;
    storeSlug = login.store?.slug;

    await api
      .put(`/api/stores/${storeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        address: 'Rua da Loja Postal, 10',
        city: 'São Paulo',
        state: 'SP',
        lat: -23.55052,
        lng: -46.633308,
        isOrderingEnabled: true,
        orderTypes: ['pickup', 'delivery'],
        deliveryRadiusKm: 12,
        deliveryFee: 8.9,
        postalEnabled: true,
        postalOriginZip: '01001000',
      });

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

  it('rejeita pedido quando a quantidade ultrapassa o estoque', async () => {
    const prod = await api
      .post(`/api/stores/${storeId}/products`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Batata Frita Meia',
        price: 23,
        category: 'Porções',
        available: true,
        manageStock: true,
        stockQuantity: 1,
      });
    const managedProductId = prod.body?.id;
    expect(managedProductId).toBeTruthy();

    const res = await api
      .post(`/api/stores/${storeId}/orders`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerName: 'Estoque Teste',
        type: 'pickup',
        items: [{ productId: managedProductId, quantity: 2 }],
        paymentMethod: 'pix',
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('ORDER-005');
    expect(res.body.details?.message || res.body.message).toMatch(/estoque/i);

    const products = await api
      .get(`/api/stores/${storeId}/products`)
      .set('Authorization', `Bearer ${adminToken}`);
    const freshProduct = products.body.find((item: any) => item.id === managedProductId);
    expect(freshProduct?.stockQuantity).toBe(1);
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

  it('salva observação do cliente e exibe na fila operacional', async () => {
    if (!productId) return;

    const note = 'Sem ketchup e avisar quando estiver chegando.';
    const created = await api
      .post(`/api/stores/${storeId}/orders`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerName: 'Cliente Observacao',
        customerNote: `  ${note}  `,
        type: 'pickup',
        items: [{ productId, quantity: 1 }],
        paymentMethod: 'pix',
      });

    expect(created.status).toBe(201);
    expect(created.body.customerNote).toBe(note);

    const queue = await api
      .get(`/api/stores/${storeId}/orders/queue`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(queue.status).toBe(200);

    const orders = Array.isArray(queue.body) ? queue.body : queue.body.orders || [];
    const queuedOrder = orders.find((order: any) => order.id === created.body.id);
    expect(queuedOrder?.customerNote).toBe(note);
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

  it('cria pedido postal, informa rastreio e monta timeline do envio', async () => {
    if (!productId) return;

    const order = await api
      .post(`/api/stores/${storeId}/orders`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerName: 'Cliente Postal',
        phone: '11999990002',
        address: 'Rua Postal, 100 - Centro',
        type: 'delivery',
        fulfillmentMode: 'postal',
        deliveryFee: 12.9,
        paymentMethod: 'pix',
        items: [{ productId, quantity: 1 }],
        postalShipment: {
          provider: 'internal_postal_v1',
          serviceCode: 'PAC',
          serviceName: 'PAC',
          estimatedDays: 5,
          price: 12.9,
          currency: 'BRL',
          originZip: '01001000',
          destinationZip: '12245000',
        },
      });

    expect(order.status, JSON.stringify(order.body)).toBe(201);
    const orderId = String(order.body?.id || '');
    expect(orderId).toBeTruthy();
    expect(String(order.body?.fulfillmentMode || '').toLowerCase()).toBe('postal');

    const beforeTracking = await api.get(`/api/orders/${orderId}/public`);
    expect(beforeTracking.status).toBe(200);
    expect(beforeTracking.body?.shipment?.trackingCode).toBeNull();
    expect(beforeTracking.body?.shipment?.trackingSummary?.label).toMatch(/aguardando|codigo/i);
    expect(Array.isArray(beforeTracking.body?.shipment?.events)).toBe(true);
    expect(beforeTracking.body.shipment.events.some((event: any) => event.status === 'pending_posting')).toBe(true);

    const invalidTracking = await api
      .patch(`/api/orders/${orderId}/postal`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ trackingCode: 'ABC', markPosted: true });
    expect(invalidTracking.status).toBe(400);

    const trackingCode = 'AA123456789BR';
    const posted = await api
      .patch(`/api/orders/${orderId}/postal`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ trackingCode, markPosted: true });
    expect(posted.status).toBe(200);
    expect(String(posted.body?.order?.status || '').toLowerCase()).toBe('dispatched');
    expect(posted.body?.shipment?.trackingCode).toBe(trackingCode);
    expect(posted.body?.shipment?.trackingUrl).toContain(trackingCode);

    const tracking = await api.get(`/api/v2/orders/${orderId}/tracking`);
    expect(tracking.status).toBe(200);
    expect(tracking.body?.shipment?.trackingCode).toBe(trackingCode);
    expect(tracking.body?.shipment?.trackingSummary?.label).toMatch(/postado|c[oó]digo/i);
    expect(tracking.body?.timeline?.some((entry: any) => entry.status === 'dispatched')).toBe(true);
    const eventStatuses = (tracking.body?.shipment?.events || []).map((event: any) => event.status);
    expect(eventStatuses).toContain('tracking_code_added');
    expect(eventStatuses).toContain('posted');
  });

  it('mantém pedido de retirada sem fluxo postal', async () => {
    if (!productId) return;
    const pickup = await api
      .post(`/api/stores/${storeId}/orders`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerName: 'Retirada Sem Postal',
        type: 'pickup',
        items: [{ productId, quantity: 1 }],
        paymentMethod: 'pix',
      });
    expect(pickup.status).toBe(201);
    expect(String(pickup.body?.fulfillmentMode || '').toLowerCase()).not.toBe('postal');

    const trackingAttempt = await api
      .patch(`/api/orders/${pickup.body.id}/postal`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ trackingCode: 'AA123456789BR', markPosted: true });
    expect(trackingAttempt.status).toBe(400);
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
