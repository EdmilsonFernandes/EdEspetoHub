import { CommandProducer } from '../bus/command-producer';
import { ServiceResponse } from '../bus/interfaces/service-response.interface';
export class OrderLib {
    constructor(private readonly p: CommandProducer) {}
    public async create(storeId: string, body: unknown, token?: string): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'order', action: 'create' }, { data: { storeId, body }, accessToken: token }); }
    public async createBySlug(slug: string, body: unknown, token?: string): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'order', action: 'createBySlug' }, { data: { slug, body }, accessToken: token }); }
    public async getPublic(orderId: string): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'order', action: 'getPublic' }, { data: { orderId } }); }
    public async getTrackingV2(orderId: string): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'order', action: 'getTrackingV2' }, { data: { orderId } }); }
    public async listQueue(storeId: string, token: string): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'order', action: 'listQueue' }, { data: { storeId }, accessToken: token }); }
    public async updateStatus(orderId: string, body: unknown, token: string): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'order', action: 'updateStatus' }, { data: { orderId, body }, accessToken: token }); }
    public async list(storeId: string, token: string): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'order', action: 'list' }, { data: { storeId }, accessToken: token }); }
    public async updateItems(orderId: string, body: unknown, token: string): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'order', action: 'updateItems' }, { data: { orderId, body }, accessToken: token }); }
    public async listHighlightsBySlug(slug: string): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'order', action: 'listHighlightsBySlug' }, { data: { slug } }); }
}
