import { beforeAll, describe, expect, it } from 'vitest';
import { api, loginAdmin, loginMotoboy, registerMotoboy, registerStore, seedApprovedMotoboyDocuments, testEmail, verifyEmailDirectly } from '../helpers';

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
    expect(String(createRes.body?.motoboy?.status || '').toUpperCase()).toBe('ACTIVE');

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

  it('loja cria motoboy sem e-mail e expõe acesso apenas por usuário', async () => {
    const temporaryPassword = 'Temp@123';
    const username = `moto.sem.email.${Date.now()}`;

    const createRes = await api
      .post(`/api/stores/${storeId}/motoboys`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Motoboy Sem Email',
        phone: '11988776644',
        username,
        password: temporaryPassword,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body).toMatchObject({
      createdAccount: true,
      credentialsEmailSent: false,
      user: {
        email: null,
        username,
        managedWithoutEmail: true,
        mustChangePassword: true,
      },
      link: {
        storeId,
        active: true,
      },
    });

    const login = await loginMotoboy(username, temporaryPassword);
    expect(login.res.status).toBe(200);
    expect(login.user).toMatchObject({
      email: null,
      username,
      role: 'MOTOBOY',
      managedWithoutEmail: true,
      mustChangePassword: true,
    });

    const listed = await api
      .get(`/api/stores/${storeId}/motoboys`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listed.status).toBe(200);
    const link = (Array.isArray(listed.body) ? listed.body : []).find((row: any) => String(row?.motoboyId || '') === String(createRes.body?.motoboy?.id || ''));
    expect(link?.motoboyUser).toMatchObject({
      email: null,
      username,
      managedWithoutEmail: true,
    });

    const profile = await api
      .get('/api/motoboy/profile')
      .set('Authorization', `Bearer ${login.token}`);

    expect(profile.status).toBe(200);
    expect(profile.body?.user).toMatchObject({
      email: null,
      username,
      managedWithoutEmail: true,
    });
  });

  it('motoboy criado pela loja já entra ativo para a loja sem etapa de Super Admin', async () => {
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
    expect(String(createRes.body?.motoboy?.status || '').toUpperCase()).toBe('ACTIVE');

    const listed = await api
      .get(`/api/stores/${storeId}/motoboys`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listed.status).toBe(200);
    const links = Array.isArray(listed.body) ? listed.body : [];
    expect(links.some((link: any) => String(link?.motoboyId || '') === motoboyId && link.active === true)).toBe(true);
  });

  it('mantém KYC obrigatório para motoboy independente vinculado pela loja', async () => {
    const storeRegistration = await registerStore();
    await verifyEmailDirectly(storeRegistration.email);
    const otherStoreId = String(storeRegistration.body.store?.id || '');
    const otherLogin = await loginAdmin(storeRegistration.email, storeRegistration.password);
    const otherAdminToken = String(otherLogin.token || '');

    const motoboyRegistration = await registerMotoboy();
    expect([200, 201]).toContain(motoboyRegistration.res.status);
    await verifyEmailDirectly(motoboyRegistration.email);

    const createRes = await api
      .post(`/api/stores/${otherStoreId}/motoboys`)
      .set('Authorization', `Bearer ${otherAdminToken}`)
      .send({ email: motoboyRegistration.email });

    expect(createRes.status).toBe(201);
    const motoboyId = String(createRes.body?.id || '');
    expect(motoboyId).toBeTruthy();

    const linkRes = await api
      .post(`/api/stores/${otherStoreId}/motoboys/${motoboyId}/link`)
      .set('Authorization', `Bearer ${otherAdminToken}`)
      .send({});
    expect(linkRes.status).toBe(200);

    const blockedApprove = await api
      .post(`/api/stores/${otherStoreId}/motoboys/${motoboyId}/approve`)
      .set('Authorization', `Bearer ${otherAdminToken}`)
      .send({});

    expect(blockedApprove.status).toBe(409);
    expect(blockedApprove.body.code).toBe('MOTO-031');

    await seedApprovedMotoboyDocuments(motoboyId);

    const approvedRes = await api
      .post(`/api/stores/${otherStoreId}/motoboys/${motoboyId}/approve`)
      .set('Authorization', `Bearer ${otherAdminToken}`)
      .send({});

    expect(approvedRes.status).toBe(200);
    expect(String(approvedRes.body?.status || '').toUpperCase()).toBe('ACTIVE');
  });

  it('re-ativa o vinculo apos desvincular (loja desvincula e vincula de novo)', async () => {
    const storeRegistration = await registerStore();
    await verifyEmailDirectly(storeRegistration.email);
    const reStoreId = String(storeRegistration.body.store?.id || '');
    const reToken = String((await loginAdmin(storeRegistration.email, storeRegistration.password)).token || '');

    const motoboyRegistration = await registerMotoboy();
    await verifyEmailDirectly(motoboyRegistration.email);

    const addRes = await api
      .post(`/api/stores/${reStoreId}/motoboys`)
      .set('Authorization', `Bearer ${reToken}`)
      .send({ email: motoboyRegistration.email });
    const motoboyId = String(addRes.body?.id || '');
    expect(motoboyId).toBeTruthy();

    await api.post(`/api/stores/${reStoreId}/motoboys/${motoboyId}/link`).set('Authorization', `Bearer ${reToken}`).send({});
    await seedApprovedMotoboyDocuments(motoboyId);

    const approved = await api.post(`/api/stores/${reStoreId}/motoboys/${motoboyId}/approve`).set('Authorization', `Bearer ${reToken}`).send({});
    expect(approved.status).toBe(200);
    expect(String(approved.body?.status || '').toUpperCase()).toBe('ACTIVE');

    const listActive = (await api.get(`/api/stores/${reStoreId}/motoboys`).set('Authorization', `Bearer ${reToken}`)).body || [];
    const activeRow = listActive.find((l: any) => String(l?.motoboyId || '') === motoboyId);
    expect(Boolean(activeRow?.active)).toBe(true);

    // desvincula
    const unlinkRes = await api.post(`/api/stores/${reStoreId}/motoboys/${motoboyId}/unlink`).set('Authorization', `Bearer ${reToken}`).send({});
    expect(unlinkRes.status).toBe(200);

    // religa — tem que voltar ativo (este era o bug do Thiago: request approved + vinculo inativo)
    const relinkRes = await api.post(`/api/stores/${reStoreId}/motoboys/${motoboyId}/link`).set('Authorization', `Bearer ${reToken}`).send({});
    expect(relinkRes.status).toBe(200);
    expect(Boolean(relinkRes.body?.active)).toBe(true);

    const listAfterRelink = (await api.get(`/api/stores/${reStoreId}/motoboys`).set('Authorization', `Bearer ${reToken}`)).body || [];
    const relinkedRow = listAfterRelink.find((l: any) => String(l?.motoboyId || '') === motoboyId);
    expect(Boolean(relinkedRow?.active)).toBe(true);
  });
});
