import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { StoreUser } from '../entities/StoreUser';

export class StoreUserRepository {
  private repository: Repository<StoreUser>;

  constructor() {
    this.repository = AppDataSource.getRepository(StoreUser);
  }

  create(data: Partial<StoreUser>) {
    return this.repository.create(data);
  }

  save(entity: StoreUser) {
    return this.repository.save(entity);
  }

  remove(entity: StoreUser) {
    return this.repository.remove(entity);
  }

  findActiveByUserId(userId: string) {
    return this.repository.find({
      where: { user: { id: userId }, isActive: true } as any,
      relations: [ 'store', 'store.settings', 'store.owner' ],
      order: { createdAt: 'ASC' },
    });
  }

  findByStoreAndUser(storeId: string, userId: string) {
    return this.repository.findOne({
      where: { store: { id: storeId }, user: { id: userId } } as any,
      relations: [ 'store', 'user' ],
    });
  }

  listByStoreId(storeId: string) {
    return this.repository.find({
      where: { store: { id: storeId }, isActive: true } as any,
      relations: [ 'user' ],
      order: { createdAt: 'DESC' },
    });
  }
}
