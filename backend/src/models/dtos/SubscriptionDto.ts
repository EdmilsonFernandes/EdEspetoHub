import { Subscription } from '../../entities/Subscription';
import { DtoAttr, DtosEntity, GenericDto } from '../../decorators/decoratos.dto';

@DtosEntity(Subscription)
export class SubscriptionDto {
  @DtoAttr()
  id: string;

  @DtoAttr()
  status: string;

  @DtoAttr()
  startDate: Date;

  @DtoAttr()
  endDate: Date;

  @DtoAttr()
  createdAt: Date;

  entity$?: GenericDto<SubscriptionDto, Subscription>;
}
