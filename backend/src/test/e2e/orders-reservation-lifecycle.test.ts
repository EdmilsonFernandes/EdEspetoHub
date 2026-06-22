import { describe, it, expect, beforeAll, beforeEach, vi, afterEach } from 'vitest';
import { api, registerStore, loginAdmin, verifyEmailDirectly, activateSubscription, exemptStorePlan } from '../helpers';
import { PushNotificationService } from '../../services/PushNotificationService';

/**
 * Phase 3 — Reservation lifecycle (E2E).
 *
 * Garante que um pedido `reservation` percorre o MESMO ciclo de vida dos demais
 * tipos (pending -> preparing -> ready), dispara o MESMO path de push a cada
 * transição e preserva o paymentStatus (não pago online) ao finalizar o "ready".
 * Também verifica que o payload da fila admin inclui `scheduledFor`/`type`.
 *
 * Espionamos o prototype de PushNotificationService porque OrderController cria
 * sua própria instância de OrderService (que instancia PushNotificationService
 * internamente) — o prototype é compartilhado por todas as instâncias.
 */
describe('Pedido — Reserva: ciclo de vida (E2E)', () => {
  let adminToken: string;
  let storeId: string;
  let productId: string;

  let guestPushSpy: ReturnType<typeof vi.spyOn>;
  let customerPushSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(async () => {
    const store = await registerStore();
    await verifyEmailDirectly(store.email);
    storeId = store.body.store?.id;
    if (storeId) await activateSubscription(storeId);
    if (storeId) await exemptStorePlan(storeId, 'Reservation Lifecycle E2E');
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
      expect(update.status, JSON.stringify(update.body)).toBe(200);
    }

    const prod = await api
      .post(`/api/stores/${storeId}/products`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Espetinho Reserva', price: 18, category: 'Espetinhos', available: true });
    productId = prod.body?.id;
  });

  beforeEach(() => {
    guestPushSpy = vi.spyOn(PushNotificationService.prototype, 'notifyGuestOrderUpdate').mockResolvedValue(undefined);
    customerPushSpy = vi.spyOn(PushNotificationService.prototype, 'notifyCustomerOrderUpdate').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const futureDate = (hoursAhead = 3) => {
    const d = new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
    return d.toISOString();
  };

  const advance = async (orderId: string, status: string) =>
    api
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status });

  it('reservation percorre pending -> preparing -> ready, dispara push e preserva scheduledFor no payload admin', async () => {
    if (!productId) return;
    const scheduledFor = futureDate(3);

    // Cria reserva NÃO paga online (dinheiro), com guestPushId para exercitar o
    // path de push (dispatchOrderUpdatePush só emite se houver customer/guest id).
    const create = await api
      .post(`/api/stores/${storeId}/orders`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerName: 'Cliente Reserva Ciclo',
        type: 'reservation',
        items: [{ productId, quantity: 2 }],
        paymentMethod: 'dinheiro',
        scheduledFor,
        partySize: 4,
        guestPushId: 'guest-reserva-lifecycle-e2e',
      });

    expect(create.status, JSON.stringify(create.body)).toBe(201);
    expect(create.body.type).toBe('reservation');
    expect(String(create.body.paymentStatus || '').toUpperCase()).toBe('PENDING');
    const orderId = create.body.id;
    expect(orderId).toBeTruthy();

    // scheduledFor trafega intacto no payload de criação.
    const createdScheduledFor = String(create.body?.scheduledFor || '');
    expect(createdScheduledFor).toBeTruthy();
    expect(new Date(createdScheduledFor).getTime()).toBeCloseTo(new Date(scheduledFor).getTime(), -2);

    // A reserva aparece na fila admin com type + scheduledFor (payload já os inclui
    // via colunas da entidade propagadas pelo TypeORM find sem select explícito).
    const queue = await api
      .get(`/api/stores/${storeId}/orders/queue`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(queue.status).toBe(200);
    const queueList = Array.isArray(queue.body) ? queue.body : queue.body?.orders || [];
    const queued = queueList.find((o: any) => o.id === orderId);
    expect(queued).toBeTruthy();
    expect(String(queued.type || '').toLowerCase()).toBe('reservation');
    expect(String(queued.scheduledFor || '')).toBeTruthy();

    // pending -> preparing (mesma transição que pickup/table).
    guestPushSpy.mockClear();
    customerPushSpy.mockClear();
    const preparing = await advance(orderId, 'preparing');
    expect(preparing.status, JSON.stringify(preparing.body)).toBe(200);
    expect(String(preparing.body.status || '').toLowerCase()).toBe('preparing');
    // O push de atualização roda no mesmo path type-agnostic.
    expect(guestPushSpy.mock.calls.length + customerPushSpy.mock.calls.length).toBeGreaterThanOrEqual(1);

    // preparing -> ready (mesma transição que pickup/table).
    guestPushSpy.mockClear();
    customerPushSpy.mockClear();
    const ready = await advance(orderId, 'ready');
    expect(ready.status, JSON.stringify(ready.body)).toBe(200);
    expect(String(ready.body.status || '').toLowerCase()).toBe('ready');
    expect(guestPushSpy.mock.calls.length + customerPushSpy.mock.calls.length).toBeGreaterThanOrEqual(1);

    // Não pago online: o paymentStatus é preservado pelo ciclo (PENDING -> PENDING),
    // exatamente como ocorre com pickup/table criados da mesma forma.
    expect(String(ready.body.paymentStatus || '').toUpperCase()).toBe('PENDING');

    // scheduledFor segue intacto após o ciclo.
    const readyScheduledFor = String(ready.body?.scheduledFor || '');
    expect(readyScheduledFor).toBeTruthy();
    expect(new Date(readyScheduledFor).getTime()).toBeCloseTo(new Date(scheduledFor).getTime(), -2);
  });
});
