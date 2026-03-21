import { OrderDelivery } from '../../entities/OrderDelivery';
import { Provide } from '../../ioc/ioc';
import { OrderDeliveryDto } from '../../models/dtos/OrderDeliveryDto';
import { Tokens } from '../../ioc/injectiontokens';
import { GenericDao } from './generic.dao';
import { In } from 'typeorm';

@Provide(Tokens.Common.DataLayer.OrderDeliveryRepository)
export class OrderDeliveryDao extends GenericDao<OrderDeliveryDto, OrderDelivery> {
  constructor() {
    super(OrderDeliveryDto);
  }

  async findByOrderId(orderId: string) {
    const repo = await this.getRepository();
    return repo.findOne({ where: { orderId } as any });
  }

  async findActiveByMotoboyId(motoboyId: string) {
    const repo = await this.getRepository();
    return repo.find({
      where: {
        motoboyId,
        status: In(['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'])
      } as any
    });
  }
}
