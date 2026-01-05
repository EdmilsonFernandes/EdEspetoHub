import { CreateProductDto } from '../dto/CreateProductDto';
import { ProductRepository } from '../repositories/ProductRepository';
import { StoreRepository } from '../repositories/StoreRepository';

export class ProductService
{
  private productRepository = new ProductRepository();
  private storeRepository = new StoreRepository();

  private ensureStoreAccess(store: Awaited<ReturnType<StoreRepository[ 'findById' ]>>, authStoreId?: string)
  {
    if (!store) throw new Error('Loja não encontrada');
    if (authStoreId && store.id !== authStoreId)
    {
      throw new Error('Sem permissão para acessar esta loja');
    }
  }

  async create(input: CreateProductDto, authStoreId?: string)
  {
    const store = await this.storeRepository.findById(input.storeId);
    this.ensureStoreAccess(store, authStoreId);

    const safeStore = store!;

    const product = this.productRepository.create({
      name: input.name,
      price: input.price,
      category: input.category,
      imageUrl: input.imageUrl,
      store: safeStore,
    });

    return this.productRepository.save(product);
  }

  async listByStoreId(storeId: string, authStoreId?: string)
  {
    const store = await this.storeRepository.findById(storeId);
    this.ensureStoreAccess(store, authStoreId);
    return this.productRepository.findByStoreId(store!.id);
  }

  async listByStoreSlug(slug: string, authStoreId?: string)
  {
    const store = await this.storeRepository.findBySlug(slug);
    this.ensureStoreAccess(store, authStoreId);
    return this.productRepository.findByStoreId(store!.id);
  }

  async update(storeId: string, productId: string, data: Partial<CreateProductDto>, authStoreId?: string)
  {
    const store = await this.storeRepository.findById(storeId);
    const product = await this.productRepository.findById(productId);
    this.ensureStoreAccess(store, authStoreId);
    if (!store || !product || product.store.id !== store.id) throw new Error('Produto não encontrado');

    product.name = data.name ?? product.name;
    product.price = data.price ?? product.price;
    product.category = data.category ?? product.category;
    product.imageUrl = data.imageUrl ?? product.imageUrl;

    return this.productRepository.save(product);
  }

  async remove(storeId: string, productId: string, authStoreId?: string)
  {
    const store = await this.storeRepository.findById(storeId);
    const product = await this.productRepository.findById(productId);
    this.ensureStoreAccess(store, authStoreId);
    if (!store || !product || product.store.id !== store.id) throw new Error('Produto não encontrado');

    return this.productRepository.delete(product.id);
  }
}
