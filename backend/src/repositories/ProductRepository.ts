import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Product } from '../entities/Product';

export class ProductRepository
{
  private repository: Repository<Product>;

  constructor()
  {
    this.repository = AppDataSource.getRepository(Product);
  }

  create(data: Partial<Product>)
  {
    return this.repository.create(data);
  }

  save(product: Product)
  {
    return this.repository.save(product);
  }

  delete(id: string)
  {
    return this.repository.delete(id);
  }

  findByStoreId(storeId: string)
  {
    return this.repository.find({
      where: { store: { id: storeId } },
      order: { createdAt: 'DESC' as any },
    });
  }

  findById(id: string)
  {
    return this.repository.findOne({ where: { id }, relations: [ 'store' ] });
  }
}
