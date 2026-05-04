import { Transporter } from '../bus/interfaces/transporter.interface';
import { ServiceRequest } from '../bus/interfaces/service-request.interface';
import { ServiceResponse } from '../bus/interfaces/service-response.interface';
import { ServiceProcessStatus } from '../bus/enums/service-process-status.enum';
import { backendClient } from '../lib/backend-client';
import { fromAxiosError } from '../lib/errors';
type Req = ServiceRequest<unknown>; type Res = ServiceResponse<unknown>;
function ok(data: unknown, httpCode = 200): Res { return { status: ServiceProcessStatus.Success, message: 'ok', data, httpCode }; }
function fail(err: unknown): Res { const e = fromAxiosError(err); return { status: ServiceProcessStatus.Fail, message: e.message, data: null, httpCode: e.statusCode }; }
export function registerOrderProcessors(t: Transporter): void {
    t.register({ service: 'order', action: 'create' }, async (r: Req): Promise<Res> => { const { storeId, body } = r.data as { storeId: string; body: unknown }; try { return ok(await backendClient.post(`/stores/${storeId}/orders`, body, r.accessToken), 201); } catch (e) { return fail(e); } });
    t.register({ service: 'order', action: 'createBySlug' }, async (r: Req): Promise<Res> => { const { slug, body } = r.data as { slug: string; body: unknown }; try { return ok(await backendClient.post(`/stores/slug/${slug}/orders`, body, r.accessToken), 201); } catch (e) { return fail(e); } });
    t.register({ service: 'order', action: 'getPublic' }, async (r: Req): Promise<Res> => { const { orderId } = r.data as { orderId: string }; try { return ok(await backendClient.get(`/orders/${orderId}/public`)); } catch (e) { return fail(e); } });
    t.register({ service: 'order', action: 'getTrackingV2' }, async (r: Req): Promise<Res> => { const { orderId } = r.data as { orderId: string }; try { return ok(await backendClient.get(`/v2/orders/${orderId}/tracking`)); } catch (e) { return fail(e); } });
    t.register({ service: 'order', action: 'listQueue' }, async (r: Req): Promise<Res> => { const { storeId } = r.data as { storeId: string }; try { return ok(await backendClient.get(`/stores/${storeId}/orders/queue`, r.accessToken)); } catch (e) { return fail(e); } });
    t.register({ service: 'order', action: 'updateStatus' }, async (r: Req): Promise<Res> => { const { orderId, body } = r.data as { orderId: string; body: unknown }; try { return ok(await backendClient.patch(`/orders/${orderId}/status`, body, r.accessToken)); } catch (e) { return fail(e); } });
    t.register({ service: 'order', action: 'list' }, async (r: Req): Promise<Res> => { const { storeId } = r.data as { storeId: string }; try { return ok(await backendClient.get(`/stores/${storeId}/orders`, r.accessToken)); } catch (e) { return fail(e); } });
    t.register({ service: 'order', action: 'updateItems' }, async (r: Req): Promise<Res> => { const { orderId, body } = r.data as { orderId: string; body: unknown }; try { return ok(await backendClient.patch(`/orders/${orderId}`, body, r.accessToken)); } catch (e) { return fail(e); } });
    t.register({ service: 'order', action: 'listHighlightsBySlug' }, async (r: Req): Promise<Res> => { const { slug } = r.data as { slug: string }; try { return ok(await backendClient.get(`/public/stores/slug/${slug}/highlights`)); } catch (e) { return fail(e); } });
}
