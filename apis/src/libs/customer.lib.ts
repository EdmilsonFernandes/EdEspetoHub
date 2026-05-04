import { CommandProducer } from '../bus/command-producer';
import { ServiceResponse } from '../bus/interfaces/service-response.interface';
export class CustomerLib {
    constructor(private readonly p: CommandProducer) {}
    public async register(body: unknown): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'customer', action: 'register' }, { data: { body } }); }
    public async login(body: unknown): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'customer', action: 'login' }, { data: { body } }); }
    public async verifyEmailCode(body: unknown): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'customer', action: 'verifyEmailCode' }, { data: { body } }); }
    public async resendEmailCode(body: unknown): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'customer', action: 'resendEmailCode' }, { data: { body } }); }
    public async me(token: string): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'customer', action: 'me' }, { data: {}, accessToken: token }); }
    public async updateMe(body: unknown, token: string): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'customer', action: 'updateMe' }, { data: { body }, accessToken: token }); }
    public async changePassword(body: unknown, token: string): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'customer', action: 'changePassword' }, { data: { body }, accessToken: token }); }
    public async deactivate(token: string): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'customer', action: 'deactivate' }, { data: {}, accessToken: token }); }
    public async listOrders(query: unknown, token: string): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'customer', action: 'listOrders' }, { data: { query }, accessToken: token }); }
    public async cancelOrder(orderId: string, body: unknown, token: string): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'customer', action: 'cancelOrder' }, { data: { orderId, body }, accessToken: token }); }
    public async confirmOrderReceived(orderId: string, token: string): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'customer', action: 'confirmOrderReceived' }, { data: { orderId }, accessToken: token }); }
    public async listAddresses(token: string): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'customer', action: 'listAddresses' }, { data: {}, accessToken: token }); }
    public async createAddress(body: unknown, token: string): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'customer', action: 'createAddress' }, { data: { body }, accessToken: token }); }
    public async lookupZipCode(cep: string): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'customer', action: 'lookupZipCode' }, { data: { cep } }); }
    public async registerPushToken(body: unknown, token: string): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'customer', action: 'registerPushToken' }, { data: { body }, accessToken: token }); }
    public async registerGuestPushToken(body: unknown): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'customer', action: 'registerGuestPushToken' }, { data: { body } }); }
}
