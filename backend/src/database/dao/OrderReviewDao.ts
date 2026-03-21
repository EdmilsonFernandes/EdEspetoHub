import { OrderReview } from '../../entities/OrderReview';
import { Provide } from '../../ioc/ioc';
import { OrderReviewDto } from '../../models/dtos/OrderReviewDto';
import { Tokens } from '../../ioc/injectiontokens';
import { GenericDao } from './generic.dao';

@Provide(Tokens.Common.DataLayer.OrderReviewRepository)
export class OrderReviewDao extends GenericDao<OrderReviewDto, OrderReview> {
  constructor() {
    super(OrderReviewDto);
  }

  async findByOrderId(orderId: string) {
    const repo = await this.getRepository();
    return repo.findOne({ where: { order: { id: orderId } } as any });
  }
}
