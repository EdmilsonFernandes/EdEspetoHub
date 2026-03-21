import { Product } from '../../entities/Product';
import { Provide } from '../../ioc/ioc';
import { ProductDto } from '../../models/dtos/ProductDto';
import { Tokens } from '../../ioc/injectiontokens';
import { GenericDao } from './generic.dao';

@Provide(Tokens.Common.DataLayer.ProductDao)
export class ProductDao extends GenericDao<ProductDto, Product> {
  constructor() {
    super(ProductDto);
  }

  async findByStoreId(storeId: string) {
    const repo = await this.getRepository();
    return repo.find({
      where: { store: { id: storeId } } as any,
      order: { category: 'ASC', name: 'ASC' } as any,
      relations: ['store']
    });
  }

  async findActiveByStoreId(storeId: string) {
    const repo = await this.getRepository();
    return repo.find({
      where: { store: { id: storeId }, active: true } as any,
      relations: ['store']
    });
  }

  async clearFeaturedByStoreId(storeId: string) {
    const repo = await this.getRepository();
    await repo.update({ store: { id: storeId } } as any, { isFeatured: false } as any);
  }
}
