import { DeliveryBillingCycle } from '../../entities/DeliveryBillingCycle';
import { Provide } from '../../ioc/ioc';
import { DeliveryBillingCycleDto } from '../../models/dtos/DeliveryBillingCycleDto';
import { Tokens } from '../../ioc/injectiontokens';
import { GenericDao } from './generic.dao';

@Provide(Tokens.Common.DataLayer.DeliveryBillingCycleRepository)
export class DeliveryBillingCycleDao extends GenericDao<DeliveryBillingCycleDto, DeliveryBillingCycle> {
  constructor() {
    super(DeliveryBillingCycleDto);
  }
}
