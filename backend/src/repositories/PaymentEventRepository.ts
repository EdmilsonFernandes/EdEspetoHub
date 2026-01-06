import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { PaymentEvent } from '../entities/PaymentEvent';

export class PaymentEventRepository {
  private repository: Repository<PaymentEvent>;

  constructor() {
    this.repository = AppDataSource.getRepository(PaymentEvent);
  }

  create(data: Partial<PaymentEvent>) {
    return this.repository.create(data);
  }

  save(event: PaymentEvent) {
    return this.repository.save(event);
  }

  findRecent(limit = 50, offset = 0) {
    return this.repository.find({
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
      relations: ['payment'],
    });
  }

  findByPaymentId(paymentId: string, limit = 50, offset = 0) {
    return this.repository.find({
      where: { payment: { id: paymentId } },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
      relations: ['payment'],
    });
  }

  findByStoreId(storeId: string, limit = 50, offset = 0) {
    return this.repository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.payment', 'payment')
      .leftJoinAndSelect('payment.store', 'store')
      .where('store.id = :storeId', { storeId })
      .orderBy('event.createdAt', 'DESC')
      .take(limit)
      .skip(offset)
      .getMany();
  }
}
