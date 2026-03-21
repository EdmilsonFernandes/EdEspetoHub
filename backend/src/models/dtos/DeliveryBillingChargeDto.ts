import { DeliveryBillingCharge } from '../../entities/DeliveryBillingCharge';
import { DtoAttr, DtosEntity, GenericDto } from '../../decorators/decoratos.dto';

@DtosEntity(DeliveryBillingCharge)
export class DeliveryBillingChargeDto {
  @DtoAttr() id: string;
  @DtoAttr() amount: number;
  @DtoAttr() status: string;
  @DtoAttr() createdAt: Date;
  entity$?: GenericDto<DeliveryBillingChargeDto, DeliveryBillingCharge>;
}
