import { CreateProductDto } from '../dto/CreateProductDto';
import { ProductRepository } from '../repositories/ProductRepository';
import { StoreRepository } from '../repositories/StoreRepository';

export class ProductService {
  private productRepository = new ProductRepository();
  private storeRepository = new StoreRepository();

  async create(input: CreateProductDto) {
    const store = await this.storeRepository.findById(input.storeId);
    if (!store) throw new Error('Loja não encontrada');

    const product = this.productRepository.create({
      name: input.name,
      price: input.price,
      category: input.category,
      imageUrl: input.imageUrl,
      store,
    });

    return this.productRepository.save(product);
  }

  async listByStore(storeId: string) {
    const store = await this.storeRepository.findById(storeId);
    if (!store) throw new Error('Loja não encontrada');
    return this.productRepository.findByStore(store);
  }
}
