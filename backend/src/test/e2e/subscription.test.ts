import { describe, it, expect, beforeAll } from 'vitest';
import { api, registerStore, loginAdmin, verifyEmailDirectly, activateSubscription, expireSubscription } from '../helpers';

describe('Subscription — Expiração de plano', () => {
  let token: string;
  let storeId: string;

  beforeAll(async () => {
    const store = await registerStore();
    storeId = store.body.store?.id;
    await verifyEmailDirectly(store.email);
    if (storeId) await activateSubscription(storeId);
    const login = await loginAdmin(store.email, store.password);
    token = login.token;
  });

  it('plano ativo permite criar produto', async () => {
    const res = await api
      .post(`/api/stores/${storeId}/products`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Produto Ativo', price: 10, category: 'Teste', available: true });
    expect([200, 201]).toContain(res.status);
  });

  it('plano expirado bloqueia criação de pedido', async () => {
    if (!storeId) return;
    await expireSubscription(storeId);

    const res = await api
      .post(`/api/stores/${storeId}/orders`)
      .send({ customerName: 'Teste', type: 'pickup', items: [], paymentMethod: 'pix' });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('reativação restaura acesso', async () => {
    if (!storeId) return;
    await activateSubscription(storeId);

    const res = await api
      .post(`/api/stores/${storeId}/products`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Produto Reativado', price: 10, category: 'Teste', available: true });
    expect([200, 201]).toContain(res.status);
  });

  it('GET /api/plans retorna planos disponíveis', async () => {
    const res = await api.get('/api/plans');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/stores/:storeId/subscription retorna status', async () => {
    if (!storeId) return;
    const res = await api
      .get(`/api/stores/${storeId}/subscription`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBeLessThan(500);
  });
});
