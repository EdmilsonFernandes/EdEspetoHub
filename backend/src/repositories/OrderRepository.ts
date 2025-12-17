import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Order } from '../entities/Order';
import { Store } from '../entities/Store';

export class OrderRepository {
  private repository: Repository<Order>;

  constructor() {
    this.repository = AppDataSource.getRepository(Order);
  }

  create(data: Partial<Order>) {
    return this.repository.create(data);
  }

  save(order: Order) {
    return this.repository.save(order);
  }

  findByStore(store: Store) {
    return this.repository.find({ where: { store }, order: { createdAt: 'DESC' } });
  }

  findQueueByStore(store: Store) {
    return this.repository.find({ where: { store, status: 'pending' }, order: { createdAt: 'ASC' } });
  }
}
