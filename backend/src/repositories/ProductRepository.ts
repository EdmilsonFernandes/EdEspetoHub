import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Product } from '../entities/Product';
import { Store } from '../entities/Store';

export class ProductRepository {
  private repository: Repository<Product>;

  constructor() {
    this.repository = AppDataSource.getRepository(Product);
  }

  create(data: Partial<Product>) {
    return this.repository.create(data);
  }

  save(product: Product) {
    return this.repository.save(product);
  }

  findByStore(store: Store) {
    return this.repository.find({ where: { store } });
  }

  findById(id: string) {
    return this.repository.findOne({ where: { id }, relations: ['store'] });
  }
}
