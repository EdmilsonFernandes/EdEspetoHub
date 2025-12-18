import { EntityManager } from 'typeorm';
import QRCode from 'qrcode';
import { Payment, PaymentMethod } from '../entities/Payment';
import { Subscription } from '../entities/Subscription';
import { Plan } from '../entities/Plan';
import { User } from '../entities/User';
import { Store } from '../entities/Store';
import { AppDataSource } from '../config/database';

export class PaymentService {
  async createPayment(
    manager: EntityManager,
    data: {
      user: User;
      store: Store;
      subscription: Subscription;
      plan: Plan;
      method: PaymentMethod;
    }
  ) {
    const paymentRepo = manager.getRepository(Payment);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const paymentLink =
      data.method === 'CREDIT_CARD'
        ? `https://pay.chamanoespeto.com/checkout/${data.subscription.id}`
        : null;

    let payment = paymentRepo.create({
      user: data.user,
      store: data.store,
      subscription: data.subscription,
      method: data.method,
      status: 'PENDING',
      amount: Number(data.plan.price),
      expiresAt,
      qrCodeBase64: null,
      paymentLink,
    } as Payment);

    payment = await paymentRepo.save(payment);

    if (payment.method === 'PIX') {
      const qrPayload = `PIX FAKE | Store: ${data.store.name} | Amount: ${Number(
        data.plan.price
      ).toFixed(2)} | PaymentId: ${payment.id}`;
      payment.qrCodeBase64 = await QRCode.toDataURL(qrPayload);
      await paymentRepo.save(payment);
    }

    return payment;
  }

  async confirmPayment(paymentId: string) {
    return AppDataSource.transaction(async (manager) => {
      const payment = await manager.getRepository(Payment).findOne({
        where: { id: paymentId },
        relations: ['subscription', 'subscription.plan', 'store', 'user'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!payment) throw new Error('Pagamento não encontrado');
      if (payment.status === 'PAID') return payment;
      if (payment.status === 'FAILED') throw new Error('Pagamento falhou');

      const subscription = payment.subscription;
      const store = payment.store;
      const plan = subscription.plan;
      const now = new Date();
      const endDate = this.addDays(now, plan.durationDays);

      payment.status = 'PAID';
      subscription.status = 'ACTIVE';
      subscription.startDate = now;
      subscription.endDate = endDate;
      store.open = true;

      await manager.save(subscription);
      await manager.save(store);
      await manager.save(payment);

      return payment;
    });
  }

  private addDays(date: Date, days: number) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  async findById(paymentId: string) {
    const paymentRepo = AppDataSource.getRepository(Payment);
    return paymentRepo.findOne({ where: { id: paymentId } });
  }
}
