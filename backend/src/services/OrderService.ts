import { CreateOrderDto } from '../dto/CreateOrderDto';
import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { OrderRepository } from '../repositories/OrderRepository';
import { ProductRepository } from '../repositories/ProductRepository';
import { StoreRepository } from '../repositories/StoreRepository';

export class OrderService {
  private orderRepository = new OrderRepository();
  private storeRepository = new StoreRepository();
  private productRepository = new ProductRepository();

  async create(input: CreateOrderDto) {
    const store = await this.storeRepository.findById(input.storeId);
    if (!store) throw new Error('Loja não encontrada');

    const order = await this.buildOrder(input, store);
    return this.orderRepository.save(order);
  }

  async createBySlug(input: Omit<CreateOrderDto, 'storeId'> & { storeSlug: string }) {
    const store = await this.storeRepository.findBySlug(input.storeSlug);
    if (!store) throw new Error('Loja não encontrada');

    const order = await this.buildOrder(input, store);
    return this.orderRepository.save(order);
  }

  async listByStoreId(storeId: string) {
    const store = await this.storeRepository.findById(storeId);
    if (!store) throw new Error('Loja não encontrada');
    return this.orderRepository.findByStore(store);
  }

  async listByStoreSlug(slug: string) {
    const store = await this.storeRepository.findBySlug(slug);
    if (!store) throw new Error('Loja não encontrada');
    return this.orderRepository.findByStore(store);
  }

  private async buildOrder(input: Omit<CreateOrderDto, 'storeId'>, store: Awaited<ReturnType<StoreRepository['findById']>>) {
    const items: OrderItem[] = [];
    let total = 0;

    for (const item of input.items) {
      const product = await this.productRepository.findById(item.productId);
      if (!product || product.store.id !== store!.id) {
        throw new Error('Produto inválido para esta loja');
      }

      const orderItem = new OrderItem();
      orderItem.product = product;
      orderItem.quantity = item.quantity;
      orderItem.price = Number(product.price) * item.quantity;
      items.push(orderItem);
      total += orderItem.price;
    }

    return this.orderRepository.create({
      customerName: input.customerName,
      phone: input.phone,
      address: input.address,
      type: input.type,
      paymentMethod: input.paymentMethod,
      items,
      total,
      store: store!,
    } as Order);
  }
}
