import { Order } from '../../entities/Order';
import { Provide } from '../../ioc/ioc';
import { OrderDto } from '../../models/dtos/OrderDto';
import { Tokens } from '../../ioc/injectiontokens';
import { GenericDao } from './generic.dao';

@Provide(Tokens.Common.DataLayer.OrderDao)
export class OrderDao extends GenericDao<OrderDto, Order> {
  constructor() {
    super(OrderDto);
  }

  async findByStoreId(storeId: string) {
    const repo = await this.getRepository();
    return repo.find({
      where: { store: { id: storeId } } as any,
      order: { createdAt: 'DESC' } as any,
      relations: ['items', 'items.product', 'store', 'store.owner']
    });
  }

  async countAll() {
    const repo = await this.getRepository();
    return repo.count();
  }
}
