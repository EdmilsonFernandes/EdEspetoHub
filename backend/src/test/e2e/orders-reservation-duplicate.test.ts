import { describe, it, expect, beforeAll } from 'vitest';
import { api, registerStore, loginAdmin, verifyEmailDirectly, activateSubscription, exemptStorePlan } from '../helpers';

/**
 * Segurança: 1 reserva ativa por usuário (até finalizar/cancelar).
 *
 * Cenários:
 *  - 2a reserva do MESMO telefone -> rejeitada (ORDER-008)
 *  - telefones DIFERENTES -> ambas aceitas
 *  - cancelar a 1a libera -> nova reserva do mesmo telefone passa
 */
describe('Pedido — Reserva duplicada por usuário (E2E)', () => {
  let adminToken: string;
  let storeId: string;
  let productId: string;

  beforeAll(async () => {
    const store = await registerStore();
    await verifyEmailDirectly(store.email);
    storeId = store.body.store?.id;
    if (storeId) await activateSubscription(storeId);
    if (storeId) await exemptStorePlan(storeId, 'Reservation Duplicate E2E');
    const login = await loginAdmin(store.email, store.password);
    adminToken = login.token;

    await api
      .put(`/api/stores/${storeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        address: 'Rua da Loja Reserva Dup, 10',
        city: 'São Paulo',
        state: 'SP',
        lat: -23.55052,
        lng: -46.633308,
        isOrderingEnabled: true,
        orderTypes: ['pickup', 'delivery', 'table', 'reservation'],
        deliveryRadiusKm: 12,
        deliveryFee: 8.9,
      });

    const prod = await api
      .post(`/api/stores/${storeId}/products`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Espetinho Reserva Dup', price: 18, category: 'Espetinhos', available: true });
    productId = prod.body?.id;
  });

  const slotDate = (hourOffset: number, minute: number) => {
    const base = new Date(Date.now() + hourOffset * 60 * 60 * 1000);
    base.setUTCSeconds(0, 0);
    base.setUTCMilliseconds(0);
    base.setUTCMinutes(minute);
    return base.toISOString();
  };

  const createReservation = async (scheduledFor: string, phone: string, label: string) =>
    api
      .post(`/api/stores/${storeId}/orders`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerName: `Cliente Dup ${label}`,
        phone,
        type: 'reservation',
        items: [{ productId, quantity: 1 }],
        paymentMethod: 'dinheiro',
        scheduledFor,
        partySize: 2,
      });

  it('rejeita a 2a reserva do MESMO telefone enquanto a 1a esta ativa (ORDER-008)', async () => {
    const slot = slotDate(6, 0);
    const first = await createReservation(slot, '5512999990001', 'mesmo-1');
    expect(first.status, JSON.stringify(first.body)).toBe(201);

    const second = await createReservation(slotDate(7, 0), '5512999990001', 'mesmo-2');
    expect(second.status).toBe(400);
    expect(second.body.code).toBe('ORDER-008');
    expect(String(second.body?.details?.message || '')).toContain('reserva ativa');
  });

  it('aceita reservas de telefones DIFERENTES', async () => {
    const slot = slotDate(8, 0);
    const a = await createReservation(slot, '5512999990099', 'outro-a');
    expect(a.status, JSON.stringify(a.body)).toBe(201);
    const b = await createReservation(slotDate(9, 0), '5512999990088', 'outro-b');
    expect(b.status, JSON.stringify(b.body)).toBe(201);
  });

  it('cancelar a reserva libera o usuario para nova reserva (ORDER-008 some)', async () => {
    const slot = slotDate(10, 0);
    const phone = '5512999990077';
    const first = await createReservation(slot, phone, 'cancela-1');
    expect(first.status, JSON.stringify(first.body)).toBe(201);

    const blocked = await createReservation(slotDate(11, 0), phone, 'cancela-2');
    expect(blocked.body.code).toBe('ORDER-008');

    const orderId = first.body?.id;
    const cancel = await api
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'cancelled' });
    expect(cancel.status, JSON.stringify(cancel.body)).toBe(200);
    expect(String(cancel.body.status || '').toLowerCase()).toBe('cancelled');

    const afterCancel = await createReservation(slotDate(12, 0), phone, 'apos-cancel');
    expect(afterCancel.status, JSON.stringify(afterCancel.body)).toBe(201);
  });
});
