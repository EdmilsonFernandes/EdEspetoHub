import { DeliveryBillingCharge } from '../../entities/DeliveryBillingCharge';
import { Provide } from '../../ioc/ioc';
import { DeliveryBillingChargeDto } from '../../models/dtos/DeliveryBillingChargeDto';
import { Tokens } from '../../ioc/injectiontokens';
import { GenericDao } from './generic.dao';

@Provide(Tokens.Common.DataLayer.DeliveryBillingChargeDao)
export class DeliveryBillingChargeDao extends GenericDao<DeliveryBillingChargeDto, DeliveryBillingCharge> {
  constructor() {
    super(DeliveryBillingChargeDto);
  }
}
