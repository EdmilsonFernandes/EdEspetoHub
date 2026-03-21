import { PaymentEvent } from '../../entities/PaymentEvent';
import { DtoAttr, DtosEntity, GenericDto } from '../../decorators/decoratos.dto';

@DtosEntity(PaymentEvent)
export class PaymentEventDto {
  @DtoAttr() id: string;
  @DtoAttr() provider: string;
  @DtoAttr() status: string;
  @DtoAttr() createdAt: Date;
  entity$?: GenericDto<PaymentEventDto, PaymentEvent>;
}
