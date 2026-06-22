import { describe, it, expect, beforeAll } from 'vitest';
import { api, registerStore, loginAdmin, verifyEmailDirectly, activateSubscription, exemptStorePlan } from '../helpers';

/**
 * Capacidade por slot de 30 min (modelo "stock").
 *
 * Cenários:
 *  - capacity=1, 2 reservas no MESMO slot de 30 min -> 2a rejeitada (ORDER-007)
 *  - 2 reservas em slots DIFERENTES -> ambas aceitas
 *  - cancelar a 1a libera a vaga -> nova reserva no mesmo slot passa
 */
describe('Pedido — Reserva por capacidade (E2E)', () => {
  let adminToken: string;
  let storeId: string;
  let productId: string;

  beforeAll(async () => {
    const store = await registerStore();
    await verifyEmailDirectly(store.email);
    storeId = store.body.store?.id;
    if (storeId) await activateSubscription(storeId);
    if (storeId) await exemptStorePlan(storeId, 'Reservation Capacity E2E');
    const login = await loginAdmin(store.email, store.password);
    adminToken = login.token;

    const update = await api
      .put(`/api/stores/${storeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        address: 'Rua da Loja Reserva Cap, 10',
        city: 'São Paulo',
        state: 'SP',
        lat: -23.55052,
        lng: -46.633308,
        isOrderingEnabled: true,
        orderTypes: ['pickup', 'delivery', 'table', 'reservation'],
        deliveryRadiusKm: 12,
        deliveryFee: 8.9,
        // Capacidade máxima de 1 reserva por slot de 30 min.
        reservationCapacity: 1,
      });
    if (update.status !== 200) {
      expect(update.status, JSON.stringify(update.body)).toBe(200);
    }

    const prod = await api
      .post(`/api/stores/${storeId}/products`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Espetinho Reserva Cap', price: 18, category: 'Espetinhos', available: true });
    productId = prod.body?.id;
  });

  // Gera um ISO futuro alinhado ao slot de 30 min do backend.
  // Base = agora + hourOffset horas; sobrescreve minuto/segundo para alinhar o slot.
  const slotDate = (hourOffset: number, minute: number) => {
    const base = new Date(Date.now() + hourOffset * 60 * 60 * 1000);
    base.setUTCSeconds(0, 0);
    base.setUTCMilliseconds(0);
    base.setUTCMinutes(minute);
    return base.toISOString();
  };

  const createReservation = async (scheduledFor: string, label: string) =>
    api
      .post(`/api/stores/${storeId}/orders`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerName: `Cliente Cap ${label}`,
        type: 'reservation',
        items: [{ productId, quantity: 1 }],
        paymentMethod: 'dinheiro',
        scheduledFor,
        partySize: 2,
      });

  it('rejeita a 2a reserva no mesmo slot de 30 min quando capacity=1 (ORDER-007)', async () => {
    if (!productId) return;
    // Mesmo slot de 30 min (minuto 00, ex.: HH:00:00 -> janela HH:00..HH:30).
    const slotA = slotDate(3, 0);

    const first = await createReservation(slotA, 'mesmo-slot-1');
    expect(first.status, JSON.stringify(first.body)).toBe(201);

    const second = await createReservation(slotA, 'mesmo-slot-2');
    expect(second.status).toBe(400);
    expect(second.body.code).toBe('ORDER-007');
    expect(String(second.body?.details?.message || '')).toContain('esgotado');
  });

  it('aceita reservas em slots de 30 min diferentes', async () => {
    if (!productId) return;
    // Slot 1: HH:00 (janela HH:00..HH:30) — já ocupado pelo teste anterior.
    // Slot 2: HH:45 (janela HH:30..HH:00+1, i.e. minuto 45 cai no slot 30-60).
    const slotB = slotDate(3, 45);

    const res = await createReservation(slotB, 'slot-diferente');
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(res.body.type).toBe('reservation');
  });

  it('cancelar a reserva libera a vaga do slot (frees capacity)', async () => {
    if (!productId) return;
    // Usa um slot totalmente novo (2h à frente) para isolamento.
    const slot = slotDate(5, 15); // minuto 15 -> slot 00..30

    const first = await createReservation(slot, 'cancela-1');
    expect(first.status, JSON.stringify(first.body)).toBe(201);
    const orderId = first.body.id;
    expect(orderId).toBeTruthy();

    // 2a tentativa no mesmo slot falha enquanto a 1a está ativa.
    const blocked = await createReservation(slot, 'cancela-2');
    expect(blocked.status).toBe(400);
    expect(blocked.body.code).toBe('ORDER-007');

    // Cancela a 1a reserva — libera a vaga.
    const cancel = await api
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'cancelled' });
    expect(cancel.status, JSON.stringify(cancel.body)).toBe(200);
    expect(String(cancel.body.status || '').toLowerCase()).toBe('cancelled');

    // Agora uma nova reserva no mesmo slot deve passar (capacidade liberada).
    const afterCancel = await createReservation(slot, 'apos-cancel');
    expect(afterCancel.status, JSON.stringify(afterCancel.body)).toBe(201);
  });
});
