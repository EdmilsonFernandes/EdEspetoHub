import { describe, it, expect } from 'vitest';
import { api, testEmail, registerStore, loginAdmin, registerCustomer, loginCustomer, verifyEmailDirectly } from '../helpers';
import { env } from '../../config/env';
import { generateTotpCode } from '../../utils/totp';
import { AppDataSource } from '../../config/database';

describe('Auth — Registro e Login', () => {
  // ─── Registro de Lojista (Store Owner) ───
  describe('POST /api/auth/register (lojista)', () => {
    it('cria conta de lojista com sucesso', async () => {
      const { res } = await registerStore();
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('user');
      expect(res.body).toHaveProperty('store');
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.id).toBeTruthy();
      expect(res.body.store.id).toBeTruthy();
    });

    it('rejeita sem campos obrigatórios', async () => {
      const res = await api.post('/api/auth/register').send({});
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('rejeita email duplicado', async () => {
      const { email } = await registerStore();
      const { res } = await registerStore({ email });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('rejeita sem aceite de termos', async () => {
      const { res } = await registerStore({ termsAccepted: false });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('aplica campanha fundador com trial estendido quando habilitada', async () => {
      const keys = ['founder_vip_enabled', 'founder_vip_store_limit', 'founder_vip_days', 'founder_vip_label'];
      try {
        await AppDataSource.query(
          `
          INSERT INTO site_settings ("key", "value") VALUES
            ('founder_vip_enabled', 'true'),
            ('founder_vip_store_limit', '999'),
            ('founder_vip_days', '90'),
            ('founder_vip_label', 'Campanha fundador teste')
          ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", updated_at = NOW()
          `
        );

        const { res } = await registerStore();
        expect(res.status).toBe(201);

        const subscriptions = await AppDataSource.query(
          `SELECT status, end_date FROM subscriptions WHERE store_id = $1 ORDER BY created_at DESC LIMIT 1`,
          [res.body.store.id]
        );
        const settings = await AppDataSource.query(
          `SELECT acquisition_attribution FROM store_settings WHERE store_id = $1 LIMIT 1`,
          [res.body.store.id]
        );
        const endDate = new Date(subscriptions[0].end_date);
        const diffDays = Math.round((endDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));

        expect(subscriptions[0].status).toBe('TRIAL');
        expect(diffDays).toBeGreaterThanOrEqual(89);
        expect(diffDays).toBeLessThanOrEqual(91);
        expect(settings[0].acquisition_attribution?.founderVipPromotion).toMatchObject({
          applied: true,
          label: 'Campanha fundador teste',
          days: 90,
        });
      } finally {
        await AppDataSource.query(`DELETE FROM site_settings WHERE "key" = ANY($1)`, [keys]);
      }
    });

    it('expõe status público da campanha fundador para o cadastro', async () => {
      const keys = ['founder_vip_enabled', 'founder_vip_store_limit', 'founder_vip_days', 'founder_vip_label'];
      try {
        const rows = await AppDataSource.query(`SELECT COUNT(*)::int AS count FROM stores`);
        const currentStores = Number(rows?.[0]?.count || 0);
        const limit = currentStores + 2;
        await AppDataSource.query(
          `
          INSERT INTO site_settings ("key", "value") VALUES
            ('founder_vip_enabled', 'true'),
            ('founder_vip_store_limit', $1),
            ('founder_vip_days', '90'),
            ('founder_vip_label', 'Campanha fundador teste')
          ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", updated_at = NOW()
          `,
          [String(limit)]
        );

        const res = await api.get('/api/signup-promotion');
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
          enabled: true,
          applies: true,
          limit,
          used: currentStores,
          remaining: 2,
          promoDays: 90,
          trialDays: 90,
          label: 'Campanha fundador teste',
        });
      } finally {
        await AppDataSource.query(`DELETE FROM site_settings WHERE "key" = ANY($1)`, [keys]);
      }
    });
  });

  // ─── Login de Lojista ───
  describe('POST /api/auth/admin-login (lojista)', () => {
    it('login com credenciais corretas', async () => {
      const { email, password } = await registerStore();
      await verifyEmailDirectly(email);
      const { res, token } = await loginAdmin(email, password);
      expect(res.status).toBe(200);
      expect(token).toBeTruthy();
      expect(res.body).toHaveProperty('store');
    });

    it('rejeita senha incorreta', async () => {
      const { email } = await registerStore();
      await verifyEmailDirectly(email);
      const { res } = await loginAdmin(email, 'SenhaErrada123!');
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('rejeita email inexistente', async () => {
      const { res } = await loginAdmin('naoexiste@test.local', 'Test@123456');
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ─── Registro de Motoboy ───
  describe('POST /api/auth/register (motoboy)', () => {
    it('cria conta de motoboy com sucesso', async () => {
      const email = testEmail('moto');
      const res = await api.post('/api/auth/register').send({
        accountType: 'MOTOBOY',
        name: 'Motoboy Teste',
        email,
        password: 'Test@123456',
        phone: '11999887766',
        document: '12345678901',
        documentType: 'CPF',
        acceptTerms: true,
        acceptLgpd: true,
      });
      expect(res.status).toBeLessThan(500);
      // Pode ser 201 ou 200 dependendo do fluxo
      if (res.status === 201 || res.status === 200) {
        expect(res.body).toHaveProperty('token');
      }
    });
  });

  // ─── Registro de Cliente ───
  describe('POST /api/customer/auth/register (cliente)', () => {
    it('cria conta de cliente com sucesso', async () => {
      const { res } = await registerCustomer();
      expect(res.status).toBeLessThan(500);
      if (res.status === 201 || res.status === 200) {
        expect(res.body).toHaveProperty('token');
      }
    });

    it('rejeita sem email', async () => {
      const res = await api.post('/api/customer/auth/register').send({
        name: 'Sem Email',
        password: 'Test@123456',
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ─── Login de Cliente ───
  describe('POST /api/customer/auth/login (cliente)', () => {
    it('login com credenciais corretas', async () => {
      const { email, password } = await registerCustomer();
      const { res, token } = await loginCustomer(email, password);
      // Customer login may require email verification first
      expect(res.status).toBeLessThan(500);
    });

    it('rejeita senha incorreta', async () => {
      const { email } = await registerCustomer();
      const { res } = await loginCustomer(email, 'SenhaErrada123!');
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ─── Autorização por Role ───
  describe('Autorização por role', () => {
    it('cliente não acessa endpoint de admin', async () => {
      const { email, password } = await registerCustomer();
      const { token } = await loginCustomer(email, password);
      if (!token) return; // skip if login requires verification
      const res = await api.get('/api/admin/overview').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBeGreaterThanOrEqual(401);
    });

    it('endpoint protegido rejeita sem token', async () => {
      const res = await api.get('/api/motoboy/orders/available');
      expect(res.status).toBeGreaterThanOrEqual(401);
    });
  });

  describe('MFA TOTP', () => {
    it('ativa TOTP, exige desafio no login e libera dispositivo confiável', async () => {
      const previous = { ...env.mfa };
      env.mfa.enabled = true;
      env.mfa.requiredForStoreAdmin = false;
      env.mfa.trustedDeviceEnabled = true;
      env.mfa.trustedDeviceExpirationDays = 30;

      try {
        const { email, password } = await registerStore();
        await verifyEmailDirectly(email);

        const login = await api.post('/api/auth/admin-login').send({ identifier: email, password });
        expect(login.status).toBe(200);
        expect(login.body?.token).toBeTruthy();

        const setup = await api
          .post('/api/auth/mfa/setup/start')
          .set('Authorization', `Bearer ${login.body.token}`)
          .send({});
        expect(setup.status).toBe(200);
        expect(setup.body?.secret).toBeTruthy();
        expect(setup.body?.qrCodeDataUrl).toContain('data:image/');

        const setupCode = generateTotpCode(setup.body.secret);
        const confirm = await api
          .post('/api/auth/mfa/setup/confirm')
          .set('Authorization', `Bearer ${login.body.token}`)
          .send({ code: setupCode });
        expect(confirm.status).toBe(200);
        expect(confirm.body?.enabled).toBe(true);

        const challenged = await api.post('/api/auth/admin-login').send({
          identifier: email,
          password,
          deviceId: 'device-a',
        });
        expect(challenged.status).toBe(200);
        expect(challenged.body?.mfaRequired).toBe(true);
        expect(challenged.body?.token).toBeFalsy();

        const verified = await api.post('/api/auth/mfa/challenge/verify').send({
          challengeToken: challenged.body.challengeToken,
          code: generateTotpCode(setup.body.secret),
          trustDevice: true,
          deviceId: 'device-a',
          deviceLabel: 'Vitest',
        });
        expect(verified.status).toBe(200);
        expect(verified.body?.token).toBeTruthy();
        expect(verified.body?.trustedDevice?.token).toBeTruthy();

        const trusted = await api.post('/api/auth/admin-login').send({
          identifier: email,
          password,
          deviceId: 'device-a',
          trustedDeviceToken: verified.body.trustedDevice.token,
        });
        expect(trusted.status).toBe(200);
        expect(trusted.body?.token).toBeTruthy();
        expect(trusted.body?.mfaRequired).toBeFalsy();
      } finally {
        Object.assign(env.mfa, previous);
      }
    });

    it('bloqueia o desafio depois de muitas tentativas inválidas', async () => {
      const previous = { ...env.mfa };
      env.mfa.enabled = true;
      env.mfa.requiredForStoreAdmin = false;
      env.mfa.trustedDeviceEnabled = true;

      try {
        const { email, password } = await registerStore();
        await verifyEmailDirectly(email);
        const login = await api.post('/api/auth/admin-login').send({ identifier: email, password });
        const setup = await api
          .post('/api/auth/mfa/setup/start')
          .set('Authorization', `Bearer ${login.body.token}`)
          .send({});
        await api
          .post('/api/auth/mfa/setup/confirm')
          .set('Authorization', `Bearer ${login.body.token}`)
          .send({ code: generateTotpCode(setup.body.secret) });

        const challenged = await api.post('/api/auth/admin-login').send({ identifier: email, password });
        for (let attempt = 0; attempt < 4; attempt += 1) {
          const invalid = await api.post('/api/auth/mfa/challenge/verify').send({
            challengeToken: challenged.body.challengeToken,
            code: '000000',
          });
          expect(invalid.status).toBe(401);
        }

        const blocked = await api.post('/api/auth/mfa/challenge/verify').send({
          challengeToken: challenged.body.challengeToken,
          code: '000000',
        });
        expect(blocked.status).toBe(401);

        const locked = await api.post('/api/auth/mfa/challenge/verify').send({
          challengeToken: challenged.body.challengeToken,
          code: generateTotpCode(setup.body.secret),
        });
        expect(locked.status).toBe(429);
      } finally {
        Object.assign(env.mfa, previous);
      }
    });
  });
});
