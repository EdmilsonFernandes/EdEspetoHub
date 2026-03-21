import { Payment } from '../../entities/Payment';
import { Provide } from '../../ioc/ioc';
import { PaymentDto } from '../../models/dtos/PaymentDto';
import { Tokens } from '../../ioc/injectiontokens';
import { GenericDao } from './generic.dao';

@Provide(Tokens.Common.DataLayer.PaymentRepository)
export class PaymentDao extends GenericDao<PaymentDto, Payment> {
  constructor() {
    super(PaymentDto);
  }

  async findLatestByStoreId(storeId: string) {
    const repo = await this.getRepository();
    return repo.findOne({
      where: { store: { id: storeId } } as any,
      order: { createdAt: 'DESC' } as any,
      relations: ['subscription', 'subscription.plan']
    });
  }

  async findLatestPaidByStoreId(storeId: string) {
    const repo = await this.getRepository();
    return repo.findOne({
      where: { store: { id: storeId }, status: 'PAID' } as any,
      order: { createdAt: 'DESC' } as any
    });
  }

  async countByStatus(status: string) {
    const repo = await this.getRepository();
    return repo.count({ where: { status } as any });
  }

  async sumPaidAmounts() {
    const repo = await this.getRepository();
    const result = await repo.createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.status = :status', { status: 'PAID' })
      .getRawOne();
    return Number(result?.total || 0);
  }
}
