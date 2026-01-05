import { CreateOrderDto, CreateOrderItemInput } from '../dto/CreateOrderDto';
import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { OrderRepository } from '../repositories/OrderRepository';
import { ProductRepository } from '../repositories/ProductRepository';
import { StoreRepository } from '../repositories/StoreRepository';
import { AppDataSource } from '../config/database';

export class OrderService
{
  private orderRepository = new OrderRepository();
  private storeRepository = new StoreRepository();
  private productRepository = new ProductRepository();

  private ensureStoreAccess(store: Awaited<ReturnType<StoreRepository[ 'findById' ]>>, authStoreId?: string)
  {
    if (!store) throw new Error('Loja não encontrada');
    if (authStoreId && store.id !== authStoreId)
    {
      throw new Error('Sem permissão para acessar esta loja');
    }
  }

  async create(input: CreateOrderDto)
  {
    const store = await this.storeRepository.findById(input.storeId);
    if (!store) throw new Error('Loja não encontrada');

    const order = await this.buildOrder(input, store);
    return this.orderRepository.save(order);
  }

  async createBySlug(input: Omit<CreateOrderDto, 'storeId'> & { storeSlug: string })
  {
    const store = await this.storeRepository.findBySlug(input.storeSlug);
    if (!store) throw new Error('Loja não encontrada');

    const order = await this.buildOrder(input, store);
    return this.orderRepository.save(order);
  }

  async listByStoreId(storeId: string, authStoreId?: string)
  {
    const store = await this.storeRepository.findById(storeId);
    this.ensureStoreAccess(store, authStoreId);
    return this.orderRepository.findByStoreId(store!.id);
  }

  async listByStoreSlug(slug: string, authStoreId?: string)
  {
    const store = await this.storeRepository.findBySlug(slug);
    this.ensureStoreAccess(store, authStoreId);
    return this.orderRepository.findByStoreId(store!.id);
  }

  async updateStatus(orderId: string, status: string, authStoreId?: string)
  {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new Error('Pedido não encontrado');
    this.ensureStoreAccess(order.store, authStoreId);

    order.status = status;
    return this.orderRepository.save(order);
  }

  async updateItems(orderId: string, items: CreateOrderItemInput[], authStoreId?: string)
  {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new Error('Pedido não encontrado');
    this.ensureStoreAccess(order.store, authStoreId);

    await AppDataSource.createQueryBuilder()
      .delete()
      .from(OrderItem)
      .where('order_id = :id', { id: order.id })
      .execute();

    const nextItems: OrderItem[] = [];
    let total = 0;

    for (const item of items)
    {
      const productId = item.productId || (item as any).id;
      if (!productId) continue;

      const product = await this.productRepository.findById(productId);
      if (!product || product.store.id !== order.store.id)
      {
        throw new Error('Produto inválido para esta loja');
      }

      const orderItem = new OrderItem();
      orderItem.product = product;
      orderItem.order = order;
      orderItem.quantity = item.quantity;
      orderItem.price = Number(product.price) * item.quantity;
      nextItems.push(orderItem);
      total += orderItem.price;
    }

    order.items = nextItems;
    order.total = total;

    return this.orderRepository.save(order);
  }

  private async buildOrder(input: Omit<CreateOrderDto, 'storeId'>, store: Awaited<ReturnType<StoreRepository[ 'findById' ]>>)
  {
    const items: OrderItem[] = [];
    let total = 0;

    for (const item of input.items)
    {
      const product = await this.productRepository.findById(item.productId);
      if (!product || product.store.id !== store!.id)
      {
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
      table: input.table,
      type: input.type,
      paymentMethod: input.paymentMethod,
      items,
      total,
      store: store!,
    } as Order);
  }
}
