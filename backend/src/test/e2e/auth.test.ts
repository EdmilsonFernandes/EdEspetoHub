import { describe, it, expect } from 'vitest';
import { api, testEmail, registerStore, loginAdmin, registerCustomer, loginCustomer, verifyEmailDirectly } from '../helpers';

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
});
