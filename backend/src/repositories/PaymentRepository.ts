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
}
