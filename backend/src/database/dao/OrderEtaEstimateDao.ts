import { OrderEtaEstimate } from '../../entities/OrderEtaEstimate';
import { Provide } from '../../ioc/ioc';
import { OrderEtaEstimateDto } from '../../models/dtos/OrderEtaEstimateDto';
import { Tokens } from '../../ioc/injectiontokens';
import { GenericDao } from './generic.dao';

@Provide(Tokens.Common.DataLayer.OrderEtaEstimateRepository)
export class OrderEtaEstimateDao extends GenericDao<OrderEtaEstimateDto, OrderEtaEstimate> {
  constructor() {
    super(OrderEtaEstimateDto);
  }
}
