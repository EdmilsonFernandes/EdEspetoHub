import { describe, it, expect, beforeAll } from 'vitest';
import { api, registerStore, loginAdmin, verifyEmailDirectly, activateSubscription, exemptStorePlan } from '../helpers';

describe('Pedido — Reserva (E2E)', () => {
  let adminToken: string;
  let storeId: string;
  let productId: string;

  beforeAll(async () => {
    const store = await registerStore();
    await verifyEmailDirectly(store.email);
    storeId = store.body.store?.id;
    if (storeId) await activateSubscription(storeId);
    if (storeId) await exemptStorePlan(storeId, 'Reservation E2E');
    const login = await loginAdmin(store.email, store.password);
    adminToken = login.token;

    const update = await api
      .put(`/api/stores/${storeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        address: 'Rua da Loja Reserva, 10',
        city: 'São Paulo',
        state: 'SP',
        lat: -23.55052,
        lng: -46.633308,
        isOrderingEnabled: true,
        orderTypes: ['pickup', 'delivery', 'table', 'reservation'],
        deliveryRadiusKm: 12,
        deliveryFee: 8.9,
      });
    if (update.status !== 200) {
      // surface PUT failures explicitly (e.g. missing geo/orderTypes)
      expect(update.status, JSON.stringify(update.body)).toBe(200);
    }

    const prod = await api
      .post(`/api/stores/${storeId}/products`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Espetinho Reserva', price: 18, category: 'Espetinhos', available: true });
    productId = prod.body?.id;
  });

  const futureDate = (hoursAhead = 3) => {
    const d = new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
    return d.toISOString();
  };

  it('cria pedido de reserva com scheduledFor futuro e partySize', async () => {
    if (!productId) return;
    const scheduledFor = futureDate(3);

    const res = await api
      .post(`/api/stores/${storeId}/orders`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerName: 'Cliente Reserva',
        type: 'reservation',
        items: [{ productId, quantity: 2 }],
        paymentMethod: 'pix',
        scheduledFor,
        partySize: 4,
      });

    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.type).toBe('reservation');
    expect(res.body.partySize).toBe(4);
    const returnedScheduledFor = String(res.body?.scheduledFor || '');
    expect(returnedScheduledFor).toBeTruthy();
    // Mesma data (ignora millisegundos de serialização)
    expect(new Date(returnedScheduledFor).getTime()).toBeCloseTo(new Date(scheduledFor).getTime(), -2);
  });

  it('rejeita reserva sem scheduledFor', async () => {
    if (!productId) return;

    const res = await api
      .post(`/api/stores/${storeId}/orders`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerName: 'Cliente Sem Horario',
        type: 'reservation',
        items: [{ productId, quantity: 1 }],
        paymentMethod: 'pix',
        partySize: 2,
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('ORDER-006');
  });

  it('rejeita reserva com scheduledFor no passado', async () => {
    if (!productId) return;

    const res = await api
      .post(`/api/stores/${storeId}/orders`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerName: 'Cliente Passado',
        type: 'reservation',
        items: [{ productId, quantity: 1 }],
        paymentMethod: 'pix',
        scheduledFor: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('ORDER-006');
  });
});
