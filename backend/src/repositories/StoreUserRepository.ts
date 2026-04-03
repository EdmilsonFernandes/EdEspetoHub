import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { StoreUser } from '../entities/StoreUser';

export class StoreUserRepository {
  private repository: Repository<StoreUser>;

  constructor() {
    this.repository = AppDataSource.getRepository(StoreUser);
  }

    /**
   * Creates resources for create.
   *
   * @author Edmilson Lopes
   */
create(data: Partial<StoreUser>) {
    return this.repository.create(data);
  }

    /**
   * Executes save business logic.
   *
   * @author Edmilson Lopes
   */
save(entity: StoreUser) {
    return this.repository.save(entity);
  }

    /**
   * Removes resources for remove.
   *
   * @author Edmilson Lopes
   */
remove(entity: StoreUser) {
    return this.repository.remove(entity);
  }

    /**
   * Retrieves data for find active by user id.
   *
   * @author Edmilson Lopes
   */
findActiveByUserId(userId: string) {
    return this.repository.find({
      where: { user: { id: userId }, isActive: true } as any,
      relations: [ 'store', 'store.settings', 'store.owner' ],
      order: { createdAt: 'ASC' },
    });
  }

    /**
   * Retrieves data for find by store and user.
   *
   * @author Edmilson Lopes
   */
findByStoreAndUser(storeId: string, userId: string) {
    return this.repository.findOne({
      where: { store: { id: storeId }, user: { id: userId } } as any,
      relations: [ 'store', 'user' ],
    });
  }

    /**
   * Lists records for list by store id.
   *
   * @author Edmilson Lopes
   */
listByStoreId(storeId: string) {
    return this.repository.find({
      where: { store: { id: storeId }, isActive: true } as any,
      relations: [ 'user' ],
      order: { createdAt: 'DESC' },
    });
  }
}
