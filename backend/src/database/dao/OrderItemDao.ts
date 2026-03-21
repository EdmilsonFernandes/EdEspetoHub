import { OrderItem } from '../../entities/OrderItem';
import { Provide } from '../../ioc/ioc';
import { OrderItemDto } from '../../models/dtos/OrderItemDto';
import { Tokens } from '../../ioc/injectiontokens';
import { GenericDao } from './generic.dao';

@Provide(Tokens.Common.DataLayer.OrderItemDao)
export class OrderItemDao extends GenericDao<OrderItemDto, OrderItem> {
  constructor() {
    super(OrderItemDto);
  }
}
