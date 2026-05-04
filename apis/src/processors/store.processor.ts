import { Transporter } from '../bus/interfaces/transporter.interface';
import { ServiceRequest } from '../bus/interfaces/service-request.interface';
import { ServiceResponse } from '../bus/interfaces/service-response.interface';
import { ServiceProcessStatus } from '../bus/enums/service-process-status.enum';
import { backendClient } from '../lib/backend-client';
import { fromAxiosError } from '../lib/errors';
type Req = ServiceRequest<unknown>; type Res = ServiceResponse<unknown>;
function ok(data: unknown, httpCode = 200): Res { return { status: ServiceProcessStatus.Success, message: 'ok', data, httpCode }; }
function fail(err: unknown): Res { const e = fromAxiosError(err); return { status: ServiceProcessStatus.Fail, message: e.message, data: null, httpCode: e.statusCode }; }
export function registerStoreProcessors(t: Transporter): void {
    t.register({ service: 'store', action: 'getBySlug' }, async (r: Req): Promise<Res> => { const { slug } = r.data as { slug: string }; try { return ok(await backendClient.get(`/stores/slug/${slug}`, r.accessToken)); } catch (e) { return fail(e); } });
    t.register({ service: 'store', action: 'listProducts' }, async (r: Req): Promise<Res> => { const { slug, category } = r.data as { slug: string; category?: string }; try { return ok(await backendClient.get(`/stores/slug/${slug}/products`, r.accessToken, category ? { category } : undefined)); } catch (e) { return fail(e); } });
    t.register({ service: 'store', action: 'listCategories' }, async (r: Req): Promise<Res> => { const { slug } = r.data as { slug: string }; try { return ok(await backendClient.get(`/stores/slug/${slug}/categories`, r.accessToken)); } catch (e) { return fail(e); } });
    t.register({ service: 'store', action: 'getTableStatus' }, async (r: Req): Promise<Res> => { const { slug } = r.data as { slug: string }; try { return ok(await backendClient.get(`/public/stores/slug/${slug}/tables/status`, r.accessToken)); } catch (e) { return fail(e); } });
}
