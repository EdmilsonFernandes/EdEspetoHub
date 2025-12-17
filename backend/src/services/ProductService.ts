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

  async update(storeId: string, productId: string, data: Partial<CreateProductDto>) {
    const store = await this.storeRepository.findById(storeId);
    const product = await this.productRepository.findById(productId);
    if (!store || !product || product.store.id !== store.id) throw new Error('Produto não encontrado');

    product.name = data.name ?? product.name;
    product.price = data.price ?? product.price;
    product.category = data.category ?? product.category;
    product.imageUrl = data.imageUrl ?? product.imageUrl;

    return this.productRepository.save(product);
  }

  async remove(storeId: string, productId: string) {
    const store = await this.storeRepository.findById(storeId);
    const product = await this.productRepository.findById(productId);
    if (!store || !product || product.store.id !== store.id) throw new Error('Produto não encontrado');

    return this.productRepository.delete(product.id);
  }
}
