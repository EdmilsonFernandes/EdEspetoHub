import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Store } from '../entities/Store';

export class StoreRepository {
  private repository: Repository<Store>;

  constructor() {
    this.repository = AppDataSource.getRepository(Store);
  }

  create(data: Partial<Store>) {
    return this.repository.create(data);
  }

  save(store: Store) {
    return this.repository.save(store);
  }

  findBySlug(slug: string) {
    return this.repository.findOne({ where: { slug }, relations: ['settings'] });
  }

  findById(identifier: string) {
    return this.repository.findOne({ where: [{ id: identifier }, { slug: identifier }], relations: ['settings'] });
  }
}
