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

  findQueueByStoreId(storeId: string)
  {
    return this.repository.find({
      where: { store: { id: storeId }, status: 'pending' },
      order: { createdAt: 'ASC' },
    });
  }
}
