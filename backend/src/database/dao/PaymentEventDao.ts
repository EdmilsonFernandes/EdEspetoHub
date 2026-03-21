import { PaymentEvent } from '../../entities/PaymentEvent';
import { Provide } from '../../ioc/ioc';
import { PaymentEventDto } from '../../models/dtos/PaymentEventDto';
import { Tokens } from '../../ioc/injectiontokens';
import { GenericDao } from './generic.dao';

@Provide(Tokens.Common.DataLayer.PaymentEventRepository)
export class PaymentEventDao extends GenericDao<PaymentEventDto, PaymentEvent> {
  constructor() {
    super(PaymentEventDto);
  }
}
