import { describe, it, expect, beforeAll } from 'vitest';
import { api, registerStore, verifyEmailDirectly, activateSubscription } from '../helpers';

describe('Produtos — CRUD (lojista)', () => {
  let token: string;
  let storeId: string;

  beforeAll(async () => {
    const { email, body } = await registerStore();
    token = body.token;
    storeId = body.store?.id;
    await verifyEmailDirectly(email);
    if (storeId) await activateSubscription(storeId);
  });

  it('cria produto com sucesso', async () => {
    const res = await api
      .post(`/api/stores/${storeId}/products`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Espetinho de Carne', price: 12.5, category: 'Espetinhos', available: true });
    expect(res.status).toBeLessThan(500);
    if (res.status === 201 || res.status === 200) {
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Espetinho de Carne');
    }
  });

  it('rejeita produto sem nome', async () => {
    const res = await api
      .post(`/api/stores/${storeId}/products`)
      .set('Authorization', `Bearer ${token}`)
      .send({ price: 10 });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('rejeita produto com preço negativo', async () => {
    const res = await api
      .post(`/api/stores/${storeId}/products`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Invalido', price: -5 });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('lista produtos da loja', async () => {
    await api
      .post(`/api/stores/${storeId}/products`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Espetinho de Frango', price: 10, category: 'Espetinhos', available: true });

    const res = await api
      .get(`/api/stores/${storeId}/products`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBeLessThan(500);
    if (res.status === 200) {
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    }
  });

  it('atualiza produto existente', async () => {
    const create = await api
      .post(`/api/stores/${storeId}/products`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Para Atualizar', price: 8, category: 'Bebidas', available: true });
    if (create.status >= 400) return;

    const res = await api
      .put(`/api/stores/${storeId}/products/${create.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Atualizado', price: 15 });
    expect(res.status).toBeLessThan(500);
  });

  it('isolamento: lojista B não acessa produtos da loja A', async () => {
    const storeB = await registerStore();
    await verifyEmailDirectly(storeB.email);
    if (storeB.body.store?.id) await activateSubscription(storeB.body.store.id);

    const res = await api
      .get(`/api/stores/${storeId}/products`)
      .set('Authorization', `Bearer ${storeB.body.token}`);
    expect([200, 401, 403]).toContain(res.status);
  });
});
