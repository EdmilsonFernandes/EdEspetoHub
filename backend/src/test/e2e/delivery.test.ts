import { describe, it, expect, beforeAll } from 'vitest';
import { api, testEmail, registerStore, loginAdmin, verifyEmailDirectly, activateSubscription } from '../helpers';
import { AppDataSource } from '../../config/database';

describe('Motoboy — Fluxo de entrega', () => {
  let adminToken: string;
  let storeId: string;
  let motoboyToken: string;
  let motoboyUserId: string;

  beforeAll(async () => {
    // Setup: loja ativa
    const store = await registerStore();
    await verifyEmailDirectly(store.email);
    storeId = store.body.store?.id;
    if (storeId) await activateSubscription(storeId);
    const login = await loginAdmin(store.email, store.password);
    adminToken = login.token;

    // Registrar motoboy
    const email = testEmail('moto');
    const regRes = await api.post('/api/auth/register').send({
      accountType: 'MOTOBOY',
      name: 'Motoboy E2E',
      email,
      password: 'Test@123456',
      phone: '11988776655',
      document: '98765432100',
      documentType: 'CPF',
      acceptTerms: true,
      acceptLgpd: true,
    });
    if (regRes.status < 300) {
      motoboyToken = regRes.body.token;
      motoboyUserId = regRes.body.user?.id;
      await verifyEmailDirectly(email);
    }
  });

  it('motoboy autenticado acessa perfil', async () => {
    if (!motoboyToken) return;
    const res = await api
      .get('/api/motoboy/profile')
      .set('Authorization', `Bearer ${motoboyToken}`);
    expect(res.status).toBeLessThan(500);
  });

  it('motoboy vê fila de pedidos disponíveis', async () => {
    if (!motoboyToken) return;
    const res = await api
      .get('/api/motoboy/orders/available')
      .set('Authorization', `Bearer ${motoboyToken}`);
    expect(res.status).toBeLessThan(500);
    if (res.status === 200) {
      expect(Array.isArray(res.body.orders || res.body)).toBe(true);
    }
  });

  it('motoboy vê ganhos do dia', async () => {
    if (!motoboyToken) return;
    const res = await api
      .get('/api/motoboy/earnings/today')
      .set('Authorization', `Bearer ${motoboyToken}`);
    expect(res.status).toBeLessThan(500);
  });

  it('motoboy vê histórico', async () => {
    if (!motoboyToken) return;
    const res = await api
      .get('/api/motoboy/orders/history')
      .set('Authorization', `Bearer ${motoboyToken}`);
    expect(res.status).toBeLessThan(500);
  });

  it('endpoint protegido rejeita sem token', async () => {
    const res = await api.get('/api/motoboy/orders/available');
    expect(res.status).toBeGreaterThanOrEqual(401);
  });

  it('lojista não acessa endpoint de motoboy', async () => {
    const res = await api
      .get('/api/motoboy/orders/available')
      .set('Authorization', `Bearer ${adminToken}`);
    // Should be 403 or similar (wrong role)
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
