import { describe, it, expect } from 'vitest';
import { api, loginAdmin, registerMotoboy, registerStore, seedApprovedMotoboyDocuments, verifyEmailDirectly } from '../helpers';

const ALWAYS_OPEN_HOURS = Array.from({ length: 7 }, (_, day) => ({
  day,
  enabled: true,
  intervals: [{ start: '00:00', end: '23:59' }],
}));

const listOrders = (payload: any) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.orders)) return payload.orders;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

describe('Fluxo E2E completo — loja, cliente e entregador', () => {
  it(
    'configura a loja e fecha os fluxos de retirada e entrega com motoboy',
    async () => {
      const storeRegistration = await registerStore();
      expect([200, 201]).toContain(storeRegistration.res.status);
      await verifyEmailDirectly(storeRegistration.email);

      const storeId = String(storeRegistration.body?.store?.id || '');
      const storeSlug = String(storeRegistration.body?.store?.slug || '');
      expect(storeId).toBeTruthy();
      expect(storeSlug).toBeTruthy();

      const adminLogin = await loginAdmin(storeRegistration.email, storeRegistration.password);
      expect(adminLogin.res.status).toBe(200);
      const adminToken = String(adminLogin.token || '');
      expect(adminToken).toBeTruthy();

      const configureStore = await api
        .put(`/api/stores/${storeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          address: 'Rua Teste, 100',
          city: 'São Paulo',
          state: 'SP',
          lat: -23.55052,
          lng: -46.633308,
          isOrderingEnabled: true,
          openingHours: ALWAYS_OPEN_HOURS,
          orderTypes: ['pickup', 'delivery'],
          deliveryRadiusKm: 12,
          deliveryFee: 8.9,
        });
      expect(configureStore.status).toBe(200);

      const openStore = await api
        .put(`/api/stores/${storeId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ open: true });
      expect(openStore.status).toBe(200);
      expect(openStore.body?.open).toBe(true);

      const productRes = await api
        .post(`/api/stores/${storeId}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Espetinho Premium',
          price: 18.5,
          category: 'Espetinhos',
          available: true,
        });
      expect(productRes.status).toBe(201);
      const productId = String(productRes.body?.id || '');
      expect(productId).toBeTruthy();

      const publicCatalog = await api.get(`/api/stores/slug/${storeSlug}/products`);
      expect(publicCatalog.status).toBe(200);
      expect(listOrders(publicCatalog.body).some((item: any) => String(item?.id || '') === productId)).toBe(true);

      const customerEmail = `cliente-full-flow-${Date.now()}@example.com`;
      const customerPassword = 'Test@123456';
      const customerRegister = await api.post('/api/customer/auth/register').send({
        fullName: 'Cliente Fluxo Completo',
        email: customerEmail,
        password: customerPassword,
        phone: '11999990001',
        termsAccepted: true,
        lgpdAccepted: true,
      });
      expect(customerRegister.status).toBe(201);
      await verifyEmailDirectly(customerEmail);

      const customerLogin = await api.post('/api/customer/auth/login').send({
        email: customerEmail,
        password: customerPassword,
      });
      expect(customerLogin.status).toBe(200);
      const customerToken = String(customerLogin.body?.token || '');
      expect(customerToken).toBeTruthy();

      const customerAddress = await api
        .post('/api/customer/addresses')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          label: 'Casa',
          recipientName: 'Cliente Fluxo Completo',
          phone: '11999990001',
          cep: '01001000',
          street: 'Rua do Cliente',
          number: '200',
          neighborhood: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          lat: -23.5512,
          lng: -46.6325,
          isDefault: true,
        });
      expect(customerAddress.status).toBe(201);

      const motoboyRegistration = await registerMotoboy();
      expect([200, 201]).toContain(motoboyRegistration.res.status);
      await verifyEmailDirectly(motoboyRegistration.email);

      const motoboyLogin = await api.post('/api/auth/login').send({
        email: motoboyRegistration.email,
        password: motoboyRegistration.password,
      });
      expect(motoboyLogin.status).toBe(200);
      const motoboyToken = String(motoboyLogin.body?.token || '');
      expect(motoboyToken).toBeTruthy();

      const createMotoboyProfile = await api
        .post(`/api/stores/${storeId}/motoboys`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: motoboyRegistration.email });
      expect(createMotoboyProfile.status).toBe(201);
      const motoboyId = String(createMotoboyProfile.body?.id || '');
      expect(motoboyId).toBeTruthy();

      const linkMotoboy = await api
        .post(`/api/stores/${storeId}/motoboys/${motoboyId}/link`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(linkMotoboy.status).toBe(200);

      await seedApprovedMotoboyDocuments(motoboyId);

      const approveMotoboy = await api
        .post(`/api/stores/${storeId}/motoboys/${motoboyId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(approveMotoboy.status).toBe(200);
      expect(String(approveMotoboy.body?.status || '').toUpperCase()).toBe('ACTIVE');

      const motoboyProfile = await api
        .get('/api/motoboy/profile')
        .set('Authorization', `Bearer ${motoboyToken}`);
      expect(motoboyProfile.status).toBe(200);
      expect(String(motoboyProfile.body?.id || '')).toBe(motoboyId);

      const pickupOrder = await api
        .post(`/api/stores/slug/${storeSlug}/orders`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          customerName: 'Cliente Fluxo Completo',
          phone: '11999990001',
          type: 'pickup',
          paymentMethod: 'dinheiro',
          items: [{ productId, quantity: 1 }],
        });
      expect(pickupOrder.status).toBe(201);
      const pickupOrderId = String(pickupOrder.body?.id || '');
      expect(pickupOrderId).toBeTruthy();
      expect(String(pickupOrder.body?.status || '').toLowerCase()).toBe('pending');

      const pickupTracking = await api.get(`/api/orders/${pickupOrderId}/public`);
      expect(pickupTracking.status).toBe(200);
      expect(String(pickupTracking.body?.id || pickupTracking.body?.order?.id || '')).toBeTruthy();

      const deliveryOrder = await api
        .post(`/api/stores/slug/${storeSlug}/orders`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          customerName: 'Cliente Fluxo Completo',
          phone: '11999990001',
          address: 'Rua do Cliente, 200 - Centro - São Paulo/SP',
          type: 'delivery',
          paymentMethod: 'dinheiro',
          deliveryFee: 8.9,
          items: [{ productId, quantity: 2 }],
        });
      expect(deliveryOrder.status).toBe(201);
      const deliveryOrderId = String(deliveryOrder.body?.id || '');
      expect(deliveryOrderId).toBeTruthy();
      expect(String(deliveryOrder.body?.status || '').toLowerCase()).toBe('pending');

      const adminQueue = await api
        .get(`/api/stores/${storeId}/orders/queue`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminQueue.status).toBe(200);
      const queueOrders = listOrders(adminQueue.body);
      expect(queueOrders.some((order: any) => String(order?.id || '') === pickupOrderId)).toBe(true);
      expect(queueOrders.some((order: any) => String(order?.id || '') === deliveryOrderId)).toBe(true);

      const markPreparing = await api
        .patch(`/api/orders/${deliveryOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'preparing' });
      expect(markPreparing.status).toBe(200);

      const markReadyForDelivery = await api
        .patch(`/api/orders/${deliveryOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ready_for_delivery' });
      expect(markReadyForDelivery.status).toBe(200);
      expect(String(markReadyForDelivery.body?.status || '').toLowerCase()).toBe('ready_for_delivery');

      const availableOrders = await api
        .get('/api/motoboy/orders/available')
        .set('Authorization', `Bearer ${motoboyToken}`);
      expect(availableOrders.status).toBe(200);
      const availableList = listOrders(availableOrders.body);
      expect(availableList.some((order: any) => String(order?.id || '') === deliveryOrderId)).toBe(true);

      const acceptDelivery = await api
        .post(`/api/motoboy/orders/${deliveryOrderId}/accept`)
        .set('Authorization', `Bearer ${motoboyToken}`)
        .send({});
      expect(acceptDelivery.status).toBe(200);
      expect(String(acceptDelivery.body?.delivery?.status || '').toUpperCase()).toBe('ACCEPTED');

      const currentAccepted = await api
        .get('/api/motoboy/orders/current')
        .set('Authorization', `Bearer ${motoboyToken}`);
      expect(currentAccepted.status).toBe(200);
      expect(String(currentAccepted.body?.id || '')).toBe(deliveryOrderId);

      const pickupDelivery = await api
        .post(`/api/motoboy/orders/${deliveryOrderId}/pickup`)
        .set('Authorization', `Bearer ${motoboyToken}`)
        .send({});
      expect(pickupDelivery.status).toBe(200);
      expect(String(pickupDelivery.body?.status || '').toUpperCase()).toBe('IN_TRANSIT');

      const currentInTransit = await api
        .get('/api/motoboy/orders/current')
        .set('Authorization', `Bearer ${motoboyToken}`);
      expect(currentInTransit.status).toBe(200);
      expect(String(currentInTransit.body?.status || '').toLowerCase()).toBe('in_delivery');
      const confirmationCode = String(currentInTransit.body?.delivery?.confirmationCode || '');
      expect(confirmationCode).toHaveLength(4);

      const delivered = await api
        .post(`/api/motoboy/orders/${deliveryOrderId}/delivered`)
        .set('Authorization', `Bearer ${motoboyToken}`)
        .send({ code: confirmationCode });
      expect(delivered.status).toBe(200);
      expect(['delivered', 'finished']).toContain(String(delivered.body?.status || '').toLowerCase());

      const customerOrders = await api
        .get('/api/customer/orders')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(customerOrders.status).toBe(200);
      const customerOrderList = listOrders(customerOrders.body);
      expect(customerOrderList.some((order: any) => String(order?.id || '') === pickupOrderId)).toBe(true);
      expect(customerOrderList.some((order: any) => String(order?.id || '') === deliveryOrderId)).toBe(true);

      const publicDeliveryTracking = await api.get(`/api/orders/${deliveryOrderId}/public`);
      expect(publicDeliveryTracking.status).toBe(200);
      expect(['delivered', 'finished']).toContain(
        String(publicDeliveryTracking.body?.status || publicDeliveryTracking.body?.order?.status || '').toLowerCase()
      );

      const motoboyHistory = await api
        .get('/api/motoboy/orders/history')
        .set('Authorization', `Bearer ${motoboyToken}`);
      expect(motoboyHistory.status).toBe(200);
      const historyOrders = listOrders(motoboyHistory.body);
      expect(historyOrders.some((order: any) => String(order?.id || '') === deliveryOrderId)).toBe(true);

      const earningsToday = await api
        .get('/api/motoboy/earnings/today')
        .set('Authorization', `Bearer ${motoboyToken}`);
      expect(earningsToday.status).toBe(200);
      expect(Number(earningsToday.body?.total || 0)).toBeGreaterThanOrEqual(8.9);
      expect(Number(earningsToday.body?.count || 0)).toBeGreaterThanOrEqual(1);
    },
    60_000
  );
});
