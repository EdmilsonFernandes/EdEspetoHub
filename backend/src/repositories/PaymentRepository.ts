import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Payment } from '../entities/Payment';

export class PaymentRepository {
  private repository: Repository<Payment>;

  constructor() {
    this.repository = AppDataSource.getRepository(Payment);
  }

  create(data: Partial<Payment>) {
    return this.repository.create(data);
  }

  save(payment: Payment) {
    return this.repository.save(payment);
  }

  findById(id: string) {
    return this.repository.findOne({ where: { id }, relations: ['subscription', 'subscription.plan', 'store', 'user'] });
  }

  findLatestByStoreId(storeId: string) {
    return this.repository.findOne({
      where: { store: { id: storeId } },
      order: { createdAt: 'DESC' },
    });
  }

  async sumPaidAmounts() {
    const result = await this.repository
      .createQueryBuilder('payment')
      .select('COALESCE(SUM(payment.amount), 0)', 'sum')
      .where('payment.status = :status', { status: 'PAID' })
      .getRawOne();
    return Number(result?.sum || 0);
  }

  async countByStatus(status: string) {
    return this.repository
      .createQueryBuilder('payment')
      .where('payment.status = :status', { status })
      .getCount();
  }

  findRecent(limit = 50) {
    return this.repository.find({
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['store', 'subscription', 'subscription.plan', 'user'],
    });
  }
}
