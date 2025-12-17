import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Subscription } from '../entities/Subscription';

export class SubscriptionRepository {
  private repository: Repository<Subscription>;

  constructor() {
    this.repository = AppDataSource.getRepository(Subscription);
  }

  create(data: Partial<Subscription>) {
    return this.repository.create(data);
  }

  save(subscription: Subscription) {
    return this.repository.save(subscription);
  }

  findLatestByStoreId(storeId: string) {
    return this.repository.findOne({
      where: { store: { id: storeId } },
      order: { endDate: 'DESC' },
      relations: ['store', 'plan'],
    });
  }

  findById(id: string) {
    return this.repository.findOne({ where: { id }, relations: ['store', 'plan'] });
  }

  findAll() {
    return this.repository.find({ relations: ['store', 'plan'] });
  }
}
