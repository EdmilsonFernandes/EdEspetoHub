import { describe, it, expect, beforeAll } from 'vitest';
import { api, registerStore, loginAdmin, verifyEmailDirectly, activateSubscription, exemptStorePlan } from '../helpers';

/**
 * Antecedencia minima (lead time) para reservas.
 *
 * Cenarios:
 *  - reservationLeadTimeHours=3, slot dentro de 3h -> rejeitado (ORDER-009)
 *  - slot com mais de 3h de antecedencia -> aceito (201)
 */
describe('Pedido — Reserva com antecedencia minima / lead time (E2E)', () => {
  let adminToken: string;
  let storeId: string;
  let productId: string;

  beforeAll(async () => {
    const store = await registerStore();
    await verifyEmailDirectly(store.email);
    storeId = store.body.store?.id;
    if (storeId) await activateSubscription(storeId);
    if (storeId) await exemptStorePlan(storeId, 'Reservation Lead Time E2E');
    const login = await loginAdmin(store.email, store.password);
    adminToken = login.token;

    const update = await api
      .put(`/api/stores/${storeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        address: 'Rua da Loja Reserva Lead, 10',
        city: 'São Paulo',
        state: 'SP',
        lat: -23.55052,
        lng: -46.633308,
        isOrderingEnabled: true,
        orderTypes: ['pickup', 'delivery', 'table', 'reservation'],
        deliveryRadiusKm: 12,
        deliveryFee: 8.9,
        reservationCapacity: 20,
        // Antecedencia minima de 3h.
        reservationLeadTimeHours: 3,
      });
    if (update.status !== 200) {
      expect(update.status, JSON.stringify(update.body)).toBe(200);
    }

    const prod = await api
      .post(`/api/stores/${storeId}/products`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Espetinho Reserva Lead', price: 18, category: 'Espetinhos', available: true });
    productId = prod.body?.id;
  });

  // Gera um ISO futuro alinhado ao slot de 30 min do backend.
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
        customerName: `Cliente Lead ${label}`,
        type: 'reservation',
        items: [{ productId, quantity: 1 }],
        paymentMethod: 'dinheiro',
        scheduledFor,
        partySize: 2,
      });

  it('rejeita reserva dentro da antecedencia minima (3h) -> ORDER-009', async () => {
    if (!productId) return;
    // Slot daqui a ~2h (dentro da janela de 3h de antecedencia).
    const soonSlot = slotDate(2, 0);

    const res = await createReservation(soonSlot, 'curto-prazo');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('ORDER-009');
    expect(String(res.body?.details?.message || '')).toContain('antecedência');
  });

  it('aceita reserva com mais de 3h de antecedencia (201)', async () => {
    if (!productId) return;
    // Slot daqui a ~5h (acima da antecedencia minima de 3h).
    const laterSlot = slotDate(5, 0);

    const res = await createReservation(laterSlot, 'longo-prazo');
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(res.body.type).toBe('reservation');
  });
});
