import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Order } from '../entities/Order';

export class OrderRepository
{
  private repository: Repository<Order>;

  constructor()
  {
    this.repository = AppDataSource.getRepository(Order);
  }

  create(data: Partial<Order>)
  {
    return this.repository.create(data);
  }

  save(order: Order)
  {
    return this.repository.save(order);
  }

  findByStoreId(storeId: string)
  {
    return this.repository.find({
      where: { store: { id: storeId } },
      order: { createdAt: 'DESC' },
    });
  }

  findById(orderId: string)
  {
    return this.repository.findOne({
      where: { id: orderId },
      relations: [ 'store', 'items', 'items.product' ],
    });
  }

  countByStoreAndStatuses(storeId: string, statuses: string[])
  {
    return this.repository
      .createQueryBuilder('o')
      .where('o.store_id = :storeId', { storeId })
      .andWhere('o.status IN (:...statuses)', { statuses })
      .getCount();
  }

  countQueueAhead(storeId: string, statuses: string[], createdAt: Date)
  {
    return this.repository
      .createQueryBuilder('o')
      .where('o.store_id = :storeId', { storeId })
      .andWhere('o.status IN (:...statuses)', { statuses })
      .andWhere('o.created_at <= :createdAt', { createdAt })
      .getCount();
  }

  findQueueByStoreId(storeId: string)
  {
    return this.repository.find({
      where: { store: { id: storeId }, status: 'pending' },
      order: { createdAt: 'ASC' },
    });
  }
}
