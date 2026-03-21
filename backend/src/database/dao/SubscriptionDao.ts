import { Subscription } from '../../entities/Subscription';
import { Provide } from '../../ioc/ioc';
import { SubscriptionDto } from '../../models/dtos/SubscriptionDto';
import { Tokens } from '../../ioc/injectiontokens';
import { GenericDao } from './generic.dao';
import { In } from 'typeorm';

@Provide(Tokens.Common.DataLayer.SubscriptionRepository)
export class SubscriptionDao extends GenericDao<SubscriptionDto, Subscription> {
  constructor() {
    super(SubscriptionDto);
  }

  async findCurrentByStoreId(storeId: string) {
    const repo = await this.getRepository();
    return repo.findOne({
      where: { store: { id: storeId } } as any,
      order: { createdAt: 'DESC' } as any,
      relations: ['plan']
    });
  }

  async countByStatuses(statuses: string[]) {
    const repo = await this.getRepository();
    return repo.count({
      where: { status: In(statuses) } as any
    });
  }
}
