import { Transporter } from '../bus/interfaces/transporter.interface';
import { ServiceRequest } from '../bus/interfaces/service-request.interface';
import { ServiceResponse } from '../bus/interfaces/service-response.interface';
import { ServiceProcessStatus } from '../bus/enums/service-process-status.enum';
import { backendClient } from '../lib/backend-client';
import { fromAxiosError } from '../lib/errors';
type Req = ServiceRequest<unknown>; type Res = ServiceResponse<unknown>;
function ok(data: unknown, httpCode = 200): Res { return { status: ServiceProcessStatus.Success, message: 'ok', data, httpCode }; }
function fail(err: unknown): Res { const e = fromAxiosError(err); return { status: ServiceProcessStatus.Fail, message: e.message, data: null, httpCode: e.statusCode }; }
export function registerCustomerProcessors(t: Transporter): void {
    t.register({ service: 'customer', action: 'register' }, async (r: Req): Promise<Res> => { const { body } = r.data as { body: unknown }; try { return ok(await backendClient.post('/customer/auth/register', body), 201); } catch (e) { return fail(e); } });
    t.register({ service: 'customer', action: 'login' }, async (r: Req): Promise<Res> => { const { body } = r.data as { body: unknown }; try { return ok(await backendClient.post('/customer/auth/login', body)); } catch (e) { return fail(e); } });
    t.register({ service: 'customer', action: 'verifyEmailCode' }, async (r: Req): Promise<Res> => { const { body } = r.data as { body: unknown }; try { return ok(await backendClient.post('/customer/auth/verify-email-code', body)); } catch (e) { return fail(e); } });
    t.register({ service: 'customer', action: 'resendEmailCode' }, async (r: Req): Promise<Res> => { const { body } = r.data as { body: unknown }; try { return ok(await backendClient.post('/customer/auth/resend-email-code', body)); } catch (e) { return fail(e); } });
    t.register({ service: 'customer', action: 'me' }, async (r: Req): Promise<Res> => { try { return ok(await backendClient.get('/customer/me', r.accessToken)); } catch (e) { return fail(e); } });
    t.register({ service: 'customer', action: 'updateMe' }, async (r: Req): Promise<Res> => { const { body } = r.data as { body: unknown }; try { return ok(await backendClient.patch('/customer/me', body, r.accessToken)); } catch (e) { return fail(e); } });
    t.register({ service: 'customer', action: 'changePassword' }, async (r: Req): Promise<Res> => { const { body } = r.data as { body: unknown }; try { return ok(await backendClient.post('/customer/me/change-password', body, r.accessToken)); } catch (e) { return fail(e); } });
    t.register({ service: 'customer', action: 'deactivate' }, async (r: Req): Promise<Res> => { try { return ok(await backendClient.patch('/customer/me/deactivate', {}, r.accessToken)); } catch (e) { return fail(e); } });
    t.register({ service: 'customer', action: 'listOrders' }, async (r: Req): Promise<Res> => { const { query } = r.data as { query: Record<string, unknown> }; try { return ok(await backendClient.get('/customer/orders', r.accessToken, query)); } catch (e) { return fail(e); } });
    t.register({ service: 'customer', action: 'cancelOrder' }, async (r: Req): Promise<Res> => { const { orderId, body } = r.data as { orderId: string; body: unknown }; try { return ok(await backendClient.post(`/customer/orders/${orderId}/cancel`, body, r.accessToken)); } catch (e) { return fail(e); } });
    t.register({ service: 'customer', action: 'confirmOrderReceived' }, async (r: Req): Promise<Res> => { const { orderId } = r.data as { orderId: string }; try { return ok(await backendClient.post(`/customer/orders/${orderId}/confirm-received`, {}, r.accessToken)); } catch (e) { return fail(e); } });
    t.register({ service: 'customer', action: 'listAddresses' }, async (r: Req): Promise<Res> => { try { return ok(await backendClient.get('/customer/addresses', r.accessToken)); } catch (e) { return fail(e); } });
    t.register({ service: 'customer', action: 'createAddress' }, async (r: Req): Promise<Res> => { const { body } = r.data as { body: unknown }; try { return ok(await backendClient.post('/customer/addresses', body, r.accessToken), 201); } catch (e) { return fail(e); } });
    t.register({ service: 'customer', action: 'lookupZipCode' }, async (r: Req): Promise<Res> => { const { cep } = r.data as { cep: string }; try { return ok(await backendClient.get(`/addresses/lookup-zip-code/${cep}`)); } catch (e) { return fail(e); } });
    t.register({ service: 'customer', action: 'registerPushToken' }, async (r: Req): Promise<Res> => { const { body } = r.data as { body: unknown }; try { return ok(await backendClient.post('/customer/push/register', body, r.accessToken)); } catch (e) { return fail(e); } });
    t.register({ service: 'customer', action: 'registerGuestPushToken' }, async (r: Req): Promise<Res> => { const { body } = r.data as { body: unknown }; try { return ok(await backendClient.post('/public/push/register', body)); } catch (e) { return fail(e); } });
}
