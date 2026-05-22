import { describe, expect, it } from 'vitest';
import {
  activateSubscription,
  api,
  exemptStorePlan,
  loginAdmin,
  loginMotoboy,
  registerCustomer,
  registerMotoboy,
  registerStore,
  seedApprovedMotoboyDocuments,
  verifyEmailDirectly,
} from '../helpers';

const ALWAYS_OPEN_HOURS = Array.from({ length: 7 }, (_, day) => ({
  day,
  enabled: true,
  intervals: [{ start: '00:00', end: '23:59' }],
}));

const asList = (payload: any) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.orders)) return payload.orders;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

async function createApprovedMotoboy(storeId: string, adminToken: string) {
  const registration = await registerMotoboy();
  expect([200, 201]).toContain(registration.res.status);
  await verifyEmailDirectly(registration.email);

  const login = await loginMotoboy(registration.email, registration.password);
  expect(login.res.status).toBe(200);
  const token = String(login.token || '');
  expect(token).toBeTruthy();

  const profile = await api
    .post(`/api/stores/${storeId}/motoboys`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ email: registration.email });
  expect(profile.status).toBe(201);
  const motoboyId = String(profile.body?.id || '');
  expect(motoboyId).toBeTruthy();

  const link = await api
    .post(`/api/stores/${storeId}/motoboys/${motoboyId}/link`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({});
  expect(link.status).toBe(200);

  await seedApprovedMotoboyDocuments(motoboyId);

  const approve = await api
    .post(`/api/stores/${storeId}/motoboys/${motoboyId}/approve`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({});
  expect(approve.status).toBe(200);

  return { motoboyId, token };
}

describe('Motoboy — Concorrencia para aceitar entrega', () => {
  it('permite apenas um motoboy aceitar o pedido disponivel', async () => {
    const store = await registerStore();
    expect([200, 201]).toContain(store.res.status);
    await verifyEmailDirectly(store.email);

    const storeId = String(store.body?.store?.id || '');
    const storeSlug = String(store.body?.store?.slug || '');
    expect(storeId).toBeTruthy();
    expect(storeSlug).toBeTruthy();
    await activateSubscription(storeId);
    await exemptStorePlan(storeId);

    const adminLogin = await loginAdmin(store.email, store.password);
    expect(adminLogin.res.status).toBe(200);
    const adminToken = String(adminLogin.token || '');
    expect(adminToken).toBeTruthy();

    const configureStore = await api
      .put(`/api/stores/${storeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        address: 'Rua Teste, 100',
        city: 'Sao Paulo',
        state: 'SP',
        lat: -23.55052,
        lng: -46.633308,
        isOrderingEnabled: true,
        openingHours: ALWAYS_OPEN_HOURS,
        orderTypes: ['delivery'],
        deliveryRadiusKm: 12,
        deliveryFee: 8.9,
      });
    expect(configureStore.status).toBe(200);

    const openStore = await api
      .put(`/api/stores/${storeId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ open: true });
    expect(openStore.status).toBe(200);

    const product = await api
      .post(`/api/stores/${storeId}/products`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Entrega Concorrente', price: 22, category: 'Teste', available: true });
    expect(product.status).toBe(201);
    const productId = String(product.body?.id || '');
    expect(productId).toBeTruthy();

    const customer = await registerCustomer({
      name: 'Cliente Concorrencia',
      fullName: 'Cliente Concorrencia',
      phone: '11999990002',
      termsAccepted: true,
      lgpdAccepted: true,
    });
    expect(customer.res.status).toBe(201);
    await verifyEmailDirectly(customer.email);

    const customerLogin = await api.post('/api/customer/auth/login').send({
      email: customer.email,
      password: customer.password,
    });
    expect(customerLogin.status).toBe(200);
    const customerToken = String(customerLogin.body?.token || '');
    expect(customerToken).toBeTruthy();

    const firstMotoboy = await createApprovedMotoboy(storeId, adminToken);
    const secondMotoboy = await createApprovedMotoboy(storeId, adminToken);

    const order = await api
      .post(`/api/stores/slug/${storeSlug}/orders`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        customerName: 'Cliente Concorrencia',
        phone: '11999990002',
        address: 'Rua do Cliente, 200 - Centro - Sao Paulo/SP',
        type: 'delivery',
        paymentMethod: 'dinheiro',
        deliveryFee: 8.9,
        items: [{ productId, quantity: 1 }],
      });
    expect(order.status).toBe(201);
    const orderId = String(order.body?.id || '');
    expect(orderId).toBeTruthy();

    const preparing = await api
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'preparing' });
    expect(preparing.status).toBe(200);

    const ready = await api
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ready_for_delivery' });
    expect(ready.status).toBe(200);

    const availableForFirst = await api
      .get('/api/motoboy/orders/available')
      .set('Authorization', `Bearer ${firstMotoboy.token}`);
    expect(availableForFirst.status).toBe(200);
    expect(asList(availableForFirst.body).some((item: any) => String(item?.id || '') === orderId)).toBe(true);

    const acceptFirst = await api
      .post(`/api/motoboy/orders/${orderId}/accept`)
      .set('Authorization', `Bearer ${firstMotoboy.token}`)
      .send({});
    expect(acceptFirst.status).toBe(200);
    expect(String(acceptFirst.body?.delivery?.motoboyId || '')).toBe(firstMotoboy.motoboyId);
    expect(String(acceptFirst.body?.delivery?.status || '').toUpperCase()).toBe('ACCEPTED');

    const acceptSecond = await api
      .post(`/api/motoboy/orders/${orderId}/accept`)
      .set('Authorization', `Bearer ${secondMotoboy.token}`)
      .send({});
    expect(acceptSecond.status).toBe(409);
    expect(acceptSecond.body?.code).toBe('DELIV-006');

    const currentFirst = await api
      .get('/api/motoboy/orders/current')
      .set('Authorization', `Bearer ${firstMotoboy.token}`);
    expect(currentFirst.status).toBe(200);
    expect(String(currentFirst.body?.id || '')).toBe(orderId);

    const currentSecond = await api
      .get('/api/motoboy/orders/current')
      .set('Authorization', `Bearer ${secondMotoboy.token}`);
    expect([200, 404]).toContain(currentSecond.status);
    if (currentSecond.status === 200) {
      expect(String(currentSecond.body?.id || '')).not.toBe(orderId);
    }
  }, 60_000);
});
