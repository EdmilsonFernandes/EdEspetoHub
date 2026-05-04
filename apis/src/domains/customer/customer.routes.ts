import { Router } from 'express';
import { CustomerController } from './customer.controller';
import { CustomerLib } from '../../libs/customer.lib';
import { CommandProducer } from '../../bus/command-producer';
import { authRequired } from '../../middleware/auth.middleware';
export function createCustomerRoutes(producer: CommandProducer): Router {
    const ctrl = new CustomerController(new CustomerLib(producer));
    const r = Router();
    r.post('/auth/register', ctrl.register.bind(ctrl));
    r.post('/auth/login', ctrl.login.bind(ctrl));
    r.post('/auth/verify-email-code', ctrl.verifyEmailCode.bind(ctrl));
    r.post('/auth/resend-email-code', ctrl.resendEmailCode.bind(ctrl));
    r.get('/lookup-zip-code/:cep', ctrl.lookupZipCode.bind(ctrl));
    r.post('/push/guest/register', ctrl.registerGuestPushToken.bind(ctrl));
    r.get('/me', authRequired, ctrl.me.bind(ctrl));
    r.patch('/me', authRequired, ctrl.updateMe.bind(ctrl));
    r.post('/me/change-password', authRequired, ctrl.changePassword.bind(ctrl));
    r.patch('/me/deactivate', authRequired, ctrl.deactivate.bind(ctrl));
    r.get('/orders', authRequired, ctrl.listOrders.bind(ctrl));
    r.post('/orders/:orderId/cancel', authRequired, ctrl.cancelOrder.bind(ctrl));
    r.post('/orders/:orderId/confirm-received', authRequired, ctrl.confirmOrderReceived.bind(ctrl));
    r.get('/addresses', authRequired, ctrl.listAddresses.bind(ctrl));
    r.post('/addresses', authRequired, ctrl.createAddress.bind(ctrl));
    r.post('/push/register', authRequired, ctrl.registerPushToken.bind(ctrl));
    return r;
}
