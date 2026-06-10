import { describe, expect, it } from 'vitest';
import { AppDataSource } from '../../config/database';
import {
  api,
  loginAdmin,
  loginCustomer,
  loginMotoboy,
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

describe('Motoboy delivery security flow', () => {
  it(
    'blocks delivery confirmation after 3 wrong codes and rejects insufficient cash confirmation',
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

      const productRes = await api
        .post(`/api/stores/${storeId}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Espetinho Seguranca',
          price: 21.5,
          category: 'Espetinhos',
          available: true,
        });
      expect(productRes.status).toBe(201);
      const productId = String(productRes.body?.id || '');
      expect(productId).toBeTruthy();

      const customerEmail = `cliente-seguranca-${Date.now()}@example.com`;
      const customerPassword = 'Test@123456';
      const customerRegister = await api.post('/api/customer/auth/register').send({
        fullName: 'Cliente Seguranca',
        email: customerEmail,
        password: customerPassword,
        phone: '11999990002',
        termsAccepted: true,
        lgpdAccepted: true,
      });
      expect(customerRegister.status).toBe(201);
      await verifyEmailDirectly(customerEmail);

      const customerLogin = await loginCustomer(customerEmail, customerPassword);
      expect(customerLogin.res.status).toBe(200);
      const customerToken = String(customerLogin.token || '');
      expect(customerToken).toBeTruthy();

      const customerAddress = await api
        .post('/api/customer/addresses')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          label: 'Casa',
          recipientName: 'Cliente Seguranca',
          phone: '11999990002',
          cep: '01001000',
          street: 'Rua do Cliente',
          number: '200',
          neighborhood: 'Centro',
          city: 'Sao Paulo',
          state: 'SP',
          lat: -23.5512,
          lng: -46.6325,
          isDefault: true,
        });
      expect(customerAddress.status).toBe(201);

      const motoboyRegistration = await registerMotoboy();
      expect([200, 201]).toContain(motoboyRegistration.res.status);
      await verifyEmailDirectly(motoboyRegistration.email);

      const motoboyLogin = await loginMotoboy(motoboyRegistration.email, motoboyRegistration.password);
      expect(motoboyLogin.res.status).toBe(200);
      const motoboyToken = String(motoboyLogin.token || '');
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

      const deliveryOrder = await api
        .post(`/api/stores/slug/${storeSlug}/orders`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          customerName: 'Cliente Seguranca',
          phone: '11999990002',
          address: 'Rua do Cliente, 200 - Centro - Sao Paulo/SP',
          type: 'delivery',
          paymentMethod: 'dinheiro',
          deliveryFee: 8.9,
          items: [{ productId, quantity: 2 }],
        });
      expect(deliveryOrder.status).toBe(201);
      const deliveryOrderId = String(deliveryOrder.body?.id || '');
      expect(deliveryOrderId).toBeTruthy();

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

      const acceptDelivery = await api
        .post(`/api/motoboy/orders/${deliveryOrderId}/accept`)
        .set('Authorization', `Bearer ${motoboyToken}`)
        .send({});
      expect(acceptDelivery.status).toBe(200);

      const pickupDelivery = await api
        .post(`/api/motoboy/orders/${deliveryOrderId}/pickup`)
        .set('Authorization', `Bearer ${motoboyToken}`)
        .send({});
      expect(pickupDelivery.status).toBe(200);

      const currentInTransit = await api
        .get('/api/motoboy/orders/current')
        .set('Authorization', `Bearer ${motoboyToken}`);
      expect(currentInTransit.status).toBe(200);
      const confirmationCode = String(currentInTransit.body?.delivery?.confirmationCode || '');
      const orderTotal = Number(currentInTransit.body?.total || 0);
      expect(confirmationCode).toHaveLength(4);
      expect(orderTotal).toBeGreaterThan(0);

      const insufficientCash = Math.max(0, Number((orderTotal - 1).toFixed(2)));
      const confirmPayment = await api
        .post(`/api/motoboy/orders/${deliveryOrderId}/confirm-payment`)
        .set('Authorization', `Bearer ${motoboyToken}`)
        .send({ cashTendered: insufficientCash });
      expect(confirmPayment.status).toBe(400);
      expect(String(confirmPayment.body?.code || '')).toBe('MOTO-036');
      expect(String(confirmPayment.body?.details?.message || '')).toContain('igual ou maior');

      const wrongCode = confirmationCode === '0000' ? '9999' : '0000';
      const wrongAttemptOne = await api
        .post(`/api/motoboy/orders/${deliveryOrderId}/delivered`)
        .set('Authorization', `Bearer ${motoboyToken}`)
        .send({ code: wrongCode });
      expect(wrongAttemptOne.status).toBe(400);
      expect(String(wrongAttemptOne.body?.code || '')).toBe('DELIV-CODE');
      expect(Number(wrongAttemptOne.body?.details?.remainingAttempts || 0)).toBe(2);

      const wrongAttemptTwo = await api
        .post(`/api/motoboy/orders/${deliveryOrderId}/delivered`)
        .set('Authorization', `Bearer ${motoboyToken}`)
        .send({ code: wrongCode });
      expect(wrongAttemptTwo.status).toBe(400);
      expect(Number(wrongAttemptTwo.body?.details?.remainingAttempts || 0)).toBe(1);

      const wrongAttemptThree = await api
        .post(`/api/motoboy/orders/${deliveryOrderId}/delivered`)
        .set('Authorization', `Bearer ${motoboyToken}`)
        .send({ code: wrongCode });
      expect(wrongAttemptThree.status).toBe(423);
      expect(String(wrongAttemptThree.body?.code || '')).toBe('MOTO-035');
      expect(Boolean(wrongAttemptThree.body?.details?.blocked)).toBe(true);

      const blockedEvenWithCorrectCode = await api
        .post(`/api/motoboy/orders/${deliveryOrderId}/delivered`)
        .set('Authorization', `Bearer ${motoboyToken}`)
        .send({ code: confirmationCode });
      expect(blockedEvenWithCorrectCode.status).toBe(423);
      expect(String(blockedEvenWithCorrectCode.body?.code || '')).toBe('MOTO-035');

      const deliveryRows = await AppDataSource.query(
        `
        SELECT confirmation_code_attempts, confirmation_code_blocked_at
        FROM order_deliveries
        WHERE order_id = $1
        `,
        [deliveryOrderId]
      );
      expect(Number(deliveryRows?.[0]?.confirmation_code_attempts || 0)).toBe(3);
      expect(deliveryRows?.[0]?.confirmation_code_blocked_at).toBeTruthy();

      const resetCode = await api
        .post(`/api/deliveries/${deliveryOrderId}/confirmation-code/reset`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Cliente confirmou o codigo correto por suporte' });
      expect(resetCode.status).toBe(200);
      expect(resetCode.body?.ok).toBe(true);
      expect(Number(resetCode.body?.confirmationCodeAttempts || -1)).toBe(0);

      const resetRows = await AppDataSource.query(
        `
        SELECT confirmation_code_attempts, confirmation_code_blocked_at
        FROM order_deliveries
        WHERE order_id = $1
        `,
        [deliveryOrderId]
      );
      expect(Number(resetRows?.[0]?.confirmation_code_attempts || -1)).toBe(0);
      expect(resetRows?.[0]?.confirmation_code_blocked_at).toBeFalsy();

      const deliveredAfterReset = await api
        .post(`/api/motoboy/orders/${deliveryOrderId}/delivered`)
        .set('Authorization', `Bearer ${motoboyToken}`)
        .send({ code: confirmationCode });
      expect(deliveredAfterReset.status).toBe(200);
    },
    70_000
  );
});
