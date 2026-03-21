import { DeliveryEvent } from '../../entities/DeliveryEvent';
import { Provide } from '../../ioc/ioc';
import { DeliveryEventDto } from '../../models/dtos/DeliveryEventDto';
import { Tokens } from '../../ioc/injectiontokens';
import { GenericDao } from './generic.dao';

@Provide(Tokens.Common.DataLayer.DeliveryEventDao)
export class DeliveryEventDao extends GenericDao<DeliveryEventDto, DeliveryEvent> {
  constructor() {
    super(DeliveryEventDto);
  }
}
