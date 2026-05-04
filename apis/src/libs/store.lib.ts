import { CommandProducer } from '../bus/command-producer';
import { ServiceResponse } from '../bus/interfaces/service-response.interface';
export class StoreLib {
    constructor(private readonly p: CommandProducer) {}
    public async getBySlug(slug: string): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'store', action: 'getBySlug' }, { data: { slug } }); }
    public async listProducts(slug: string, category?: string): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'store', action: 'listProducts' }, { data: { slug, category } }); }
    public async listCategories(slug: string): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'store', action: 'listCategories' }, { data: { slug } }); }
    public async getTableStatus(slug: string): Promise<ServiceResponse<unknown>> { return this.p.send({ service: 'store', action: 'getTableStatus' }, { data: { slug } }); }
}
