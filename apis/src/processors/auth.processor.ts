import { Transporter } from '../bus/interfaces/transporter.interface';
import { ServiceRequest } from '../bus/interfaces/service-request.interface';
import { ServiceResponse } from '../bus/interfaces/service-response.interface';
import { ServiceProcessStatus } from '../bus/enums/service-process-status.enum';
import { backendClient } from '../lib/backend-client';
import { fromAxiosError } from '../lib/errors';
type Req = ServiceRequest<unknown>; type Res = ServiceResponse<unknown>;
function ok(data: unknown, httpCode = 200): Res { return { status: ServiceProcessStatus.Success, message: 'ok', data, httpCode }; }
function fail(err: unknown): Res { const e = fromAxiosError(err); return { status: ServiceProcessStatus.Fail, message: e.message, data: null, httpCode: e.statusCode }; }
export function registerAuthProcessors(t: Transporter): void {
    t.register({ service: 'auth', action: 'register' }, async (r: Req): Promise<Res> => { const { body } = r.data as { body: unknown }; try { return ok(await backendClient.post('/auth/register', body), 201); } catch (e) { return fail(e); } });
    t.register({ service: 'auth', action: 'preflight' }, async (r: Req): Promise<Res> => { const { body } = r.data as { body: unknown }; try { return ok(await backendClient.post('/auth/register/preflight', body)); } catch (e) { return fail(e); } });
    t.register({ service: 'auth', action: 'login' }, async (r: Req): Promise<Res> => { const { body } = r.data as { body: unknown }; try { return ok(await backendClient.post('/auth/login', body)); } catch (e) { return fail(e); } });
    t.register({ service: 'auth', action: 'adminLogin' }, async (r: Req): Promise<Res> => { const { body } = r.data as { body: unknown }; try { return ok(await backendClient.post('/auth/admin-login', body)); } catch (e) { return fail(e); } });
    t.register({ service: 'auth', action: 'superAdminLogin' }, async (r: Req): Promise<Res> => { const { body } = r.data as { body: unknown }; try { return ok(await backendClient.post('/auth/super-login', body)); } catch (e) { return fail(e); } });
    t.register({ service: 'auth', action: 'condominiumLogin' }, async (r: Req): Promise<Res> => { const { body } = r.data as { body: unknown }; try { return ok(await backendClient.post('/auth/condominium-login', body)); } catch (e) { return fail(e); } });
    t.register({ service: 'auth', action: 'forgotPassword' }, async (r: Req): Promise<Res> => { const { body } = r.data as { body: unknown }; try { return ok(await backendClient.post('/auth/forgot-password', body)); } catch (e) { return fail(e); } });
    t.register({ service: 'auth', action: 'resetPassword' }, async (r: Req): Promise<Res> => { const { body } = r.data as { body: unknown }; try { return ok(await backendClient.post('/auth/reset-password', body)); } catch (e) { return fail(e); } });
    t.register({ service: 'auth', action: 'verifyEmail' }, async (r: Req): Promise<Res> => { const { body } = r.data as { body: unknown }; try { return ok(await backendClient.post('/auth/verify-email', body)); } catch (e) { return fail(e); } });
    t.register({ service: 'auth', action: 'resendVerification' }, async (r: Req): Promise<Res> => { const { body } = r.data as { body: unknown }; try { return ok(await backendClient.post('/auth/resend-verification', body)); } catch (e) { return fail(e); } });
    t.register({ service: 'auth', action: 'changePassword' }, async (r: Req): Promise<Res> => { const { body } = r.data as { body: unknown }; try { return ok(await backendClient.post('/auth/change-password', body, r.accessToken)); } catch (e) { return fail(e); } });
}
