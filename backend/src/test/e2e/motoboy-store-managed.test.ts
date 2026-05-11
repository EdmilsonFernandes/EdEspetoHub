import { beforeAll, describe, expect, it } from 'vitest';
import { api, loginAdmin, loginMotoboy, registerStore, seedApprovedMotoboyDocuments, testEmail, verifyEmailDirectly } from '../helpers';

describe('Motoboy — fluxo gerenciado pela loja', () => {
  let adminToken = '';
  let storeId = '';

  beforeAll(async () => {
    const store = await registerStore();
    await verifyEmailDirectly(store.email);
    storeId = String(store.body.store?.id || '');
    const login = await loginAdmin(store.email, store.password);
    adminToken = String(login.token || '');
  });

  it('loja cria motoboy com acesso próprio e login por username', async () => {
    const email = testEmail('moto-loja');
    const temporaryPassword = 'Temp@123';
    const username = `moto.loja.${Date.now()}`;

    const createRes = await api
      .post(`/api/stores/${storeId}/motoboys`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Motoboy da Loja',
        email,
        phone: '11988776655',
        username: `  ${username.toUpperCase()}  `,
        password: temporaryPassword,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body).toMatchObject({
      createdAccount: true,
      user: {
        email,
        username,
        mustChangePassword: true,
      },
      link: {
        storeId,
        active: true,
      },
    });
    expect(String(createRes.body?.motoboy?.status || '').toUpperCase()).toBe('PENDING_VERIFICATION');

    const firstLogin = await loginMotoboy(`  ${username}  `, temporaryPassword);
    expect(firstLogin.res.status).toBe(200);
    expect(firstLogin.user).toMatchObject({
      username,
      mustChangePassword: true,
      role: 'MOTOBOY',
    });
    expect(firstLogin.res.body.mustChangePassword).toBe(true);

    const changePasswordRes = await api
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${firstLogin.token}`)
      .send({
        currentPassword: temporaryPassword,
        newPassword: 'Nova@123',
      });

    expect(changePasswordRes.status).toBe(200);
    expect(changePasswordRes.body.code).toBe('AUTH-S005');

    const secondLogin = await loginMotoboy(username, 'Nova@123');
    expect(secondLogin.res.status).toBe(200);
    expect(secondLogin.user).toMatchObject({
      username,
      mustChangePassword: false,
    });
    expect(secondLogin.res.body.mustChangePassword).toBe(false);
  });

  it('bloqueia liberar operação sem KYC e permite após documentos aprovados', async () => {
    const createRes = await api
      .post(`/api/stores/${storeId}/motoboys`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Motoboy KYC',
        email: testEmail('moto-kyc'),
        phone: '11977665544',
        username: `moto.kyc.${Date.now()}`,
        password: 'Temp@123',
      });

    expect(createRes.status).toBe(201);
    const motoboyId = String(createRes.body?.motoboy?.id || '');
    expect(motoboyId).toBeTruthy();

    const blockedApprove = await api
      .post(`/api/stores/${storeId}/motoboys/${motoboyId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(blockedApprove.status).toBe(409);
    expect(blockedApprove.body.code).toBe('MOTO-031');

    await seedApprovedMotoboyDocuments(motoboyId);

    const approvedRes = await api
      .post(`/api/stores/${storeId}/motoboys/${motoboyId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(approvedRes.status).toBe(200);
    expect(String(approvedRes.body?.status || '').toUpperCase()).toBe('ACTIVE');
  });
});
