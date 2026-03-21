import { DeliveryBillingCycle } from '../../entities/DeliveryBillingCycle';
import { DtoAttr, DtosEntity, GenericDto } from '../../decorators/decoratos.dto';

@DtosEntity(DeliveryBillingCycle)
export class DeliveryBillingCycleDto {
  @DtoAttr() id: string;
  @DtoAttr() status: string;
  @DtoAttr() startDate: Date;
  @DtoAttr() endDate: Date;
  @DtoAttr() createdAt: Date;
  entity$?: GenericDto<DeliveryBillingCycleDto, DeliveryBillingCycle>;
}
