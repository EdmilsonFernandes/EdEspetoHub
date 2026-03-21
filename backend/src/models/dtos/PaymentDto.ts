import { Payment } from '../../entities/Payment';
import { DtoAttr, DtosEntity, GenericDto } from '../../decorators/decoratos.dto';

@DtosEntity(Payment)
export class PaymentDto {
  @DtoAttr()
  id: string;

  @DtoAttr()
  status: string;

  @DtoAttr()
  method: string;

  @DtoAttr()
  amount: number;

  @DtoAttr()
  createdAt: Date;

  entity$?: GenericDto<PaymentDto, Payment>;
}
