import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { api, registerStore, loginAdmin, verifyEmailDirectly, activateSubscription, expireSubscription } from '../helpers';
import { AppDataSource } from '../../config/database';

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

  it('GET /api/plans retorna tabela pública sem variantes fundador', async () => {
    const res = await api.get('/api/plans');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const byName = new Map(res.body.map((plan: any) => [plan.name, plan]));
    expect(Number((byName.get('basic_monthly') as any)?.price)).toBe(89.9);
    expect(Number((byName.get('pro_monthly') as any)?.price)).toBe(149.9);
    expect(Number((byName.get('basic_yearly') as any)?.price)).toBe(1078.8);
    expect(Number((byName.get('basic_yearly') as any)?.promoPrice)).toBe(916.98);
    expect(Number((byName.get('pro_yearly') as any)?.price)).toBe(1798.8);
    expect(Number((byName.get('pro_yearly') as any)?.promoPrice)).toBe(1528.98);
    // Variantes fundador (preço vitalício) nunca aparecem na listagem pública
    expect(byName.has('founder_basic_monthly')).toBe(false);
    expect(byName.has('founder_pro_monthly')).toBe(false);
  });

  it('GET /api/stores/:storeId/subscription retorna status', async () => {
    if (!storeId) return;
    const res = await api
      .get(`/api/stores/${storeId}/subscription`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBeLessThan(500);
  });
});

describe('Subscription — Condição Fundador (preço vitalício)', () => {
  const campaignKeys = ['founder_vip_enabled', 'founder_vip_store_limit', 'founder_vip_days', 'founder_vip_label'];

  const seedCampaign = async (limit = '999') => {
    await AppDataSource.query(
      `
      INSERT INTO site_settings ("key", "value") VALUES
        ('founder_vip_enabled', 'true'),
        ('founder_vip_store_limit', $1),
        ('founder_vip_days', '90'),
        ('founder_vip_label', 'Campanha fundador teste')
      ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", updated_at = NOW()
      `,
      [limit]
    );
  };

  const stripFounderAttribution = async (storeId: string) => {
    await AppDataSource.query(
      `UPDATE store_settings SET acquisition_attribution = acquisition_attribution - 'founderVipPromotion' WHERE store_id = $1`,
      [storeId]
    );
  };

  const getPlanIdByName = async (name: string) => {
    const rows = await AppDataSource.query(`SELECT id FROM plans WHERE name = $1 LIMIT 1`, [name]);
    return rows?.[0]?.id;
  };

  afterAll(async () => {
    await AppDataSource.query(`DELETE FROM site_settings WHERE "key" = ANY($1)`, [campaignKeys]);
  });

  it('signup na campanha nasce no plano fundador com attribution', async () => {
    await seedCampaign();
    const store = await registerStore();
    expect(store.res.status).toBe(201);

    const rows = await AppDataSource.query(
      `SELECT p.name AS plan_name, s.status FROM subscriptions s JOIN plans p ON p.id = s.plan_id WHERE s.store_id = $1 ORDER BY s.created_at DESC LIMIT 1`,
      [store.body.store.id]
    );
    expect(rows[0].plan_name).toBe('founder_basic_monthly');
    expect(rows[0].status).toBe('TRIAL');
  });

  it('GET /stores/:storeId/plans expõe variantes fundador para loja fundadora', async () => {
    await seedCampaign();
    const store = await registerStore();
    await verifyEmailDirectly(store.email);
    const login = await loginAdmin(store.email, store.password);

    const res = await api
      .get(`/api/stores/${store.body.store.id}/plans`)
      .set('Authorization', `Bearer ${login.token}`);
    expect(res.status).toBe(200);
    expect(res.body.founder).toBe(true);
    const founderByName = new Map(res.body.founderPlans.map((plan: any) => [plan.name, plan]));
    expect(Number((founderByName.get('founder_basic_monthly') as any)?.price)).toBe(69.9);
    expect(Number((founderByName.get('founder_pro_monthly') as any)?.price)).toBe(119.9);
  });

  it('renovação de loja fundadora cobra o preço fundador mesmo pedindo plano regular', async () => {
    await seedCampaign();
    const store = await registerStore();
    await verifyEmailDirectly(store.email);
    const login = await loginAdmin(store.email, store.password);
    const regularBasicPlanId = await getPlanIdByName('basic_monthly');

    const res = await api
      .post(`/api/stores/${store.body.store.id}/subscription/renew`)
      .set('Authorization', `Bearer ${login.token}`)
      .send({ planId: regularBasicPlanId, paymentMethod: 'PIX' });
    expect(res.status).toBe(201);
    expect(Number(res.body.amount)).toBe(69.9);

    // A assinatura criada aponta para o plano fundador (preço travado vitalício)
    const rows = await AppDataSource.query(
      `SELECT p.name AS plan_name FROM subscriptions s JOIN plans p ON p.id = s.plan_id WHERE s.store_id = $1 ORDER BY s.created_at DESC LIMIT 1`,
      [store.body.store.id]
    );
    expect(rows[0].plan_name).toBe('founder_basic_monthly');
  });

  it('loja não-fundadora não pode renovar com plano fundador (SUB-004)', async () => {
    const store = await registerStore();
    await verifyEmailDirectly(store.email);
    const login = await loginAdmin(store.email, store.password);
    await stripFounderAttribution(store.body.store.id);
    const founderPlanId = await getPlanIdByName('founder_pro_monthly');

    const res = await api
      .post(`/api/stores/${store.body.store.id}/subscription/renew`)
      .set('Authorization', `Bearer ${login.token}`)
      .send({ planId: founderPlanId, paymentMethod: 'PIX' });
    expect(res.status).toBe(400);
    expect(res.body?.code || res.body?.error?.code).toBe('SUB-004');
  });
});
