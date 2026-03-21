import { Store } from '../../entities/Store';
import { Provide } from '../../ioc/ioc';
import { StoreDto } from '../../models/dtos/StoreDto';
import { Tokens } from '../../ioc/injectiontokens';
import { GenericDao } from './generic.dao';

@Provide(Tokens.Common.DataLayer.StoreRepository)
export class StoreDao extends GenericDao<StoreDto, Store> {
  constructor() {
    super(StoreDto);
  }

  async findBySlug(slug: string) {
    const repository = await this.getRepository();
    return repository.findOne({ where: { slug }, relations: ['settings'] });
  }

  async findBySlugWithOwner(slug: string) {
    const repository = await this.getRepository();
    return repository.findOne({ where: { slug }, relations: ['settings', 'owner'] });
  }

  async findById(identifier: string) {
    const repository = await this.getRepository();
    return repository.findOne({ where: { id: identifier }, relations: ['settings'] });
  }

  async findByIdWithOwner(identifier: string) {
    const repository = await this.getRepository();
    return repository.findOne({ where: { id: identifier }, relations: ['settings', 'owner'] });
  }

  async findByOwnerId(ownerId: string) {
    const repository = await this.getRepository();
    return repository.findOne({ where: { owner: { id: ownerId } }, relations: ['settings', 'owner'] });
  }

  async findByName(name: string) {
    const repository = await this.getRepository();
    return repository.findOne({ where: { name } });
  }

  async findAll() {
    const repository = await this.getRepository();
    return repository.find({ relations: ['settings', 'owner'] });
  }

  async countAll() {
    const repository = await this.getRepository();
    return repository.count();
  }

  async countActiveForPublicMetrics() {
    const repository = await this.getRepository();
    return repository
      .createQueryBuilder('store')
      .leftJoin('store.settings', 'settings')
      .leftJoin('store.subscriptions', 'subscription')
      .where('COALESCE(settings.planExempt, false) = true')
      .orWhere('subscription.status IN (:...statuses)', {
        statuses: ['ACTIVE', 'EXPIRING', 'TRIAL'],
      })
      .select('COUNT(DISTINCT store.id)', 'count')
      .getRawOne()
      .then((row: any) => Number(row?.count || 0));
  }
}
