import { DeliveryEvent } from '../../entities/DeliveryEvent';
import { DtoAttr, DtosEntity, GenericDto } from '../../decorators/decoratos.dto';

@DtosEntity(DeliveryEvent)
export class DeliveryEventDto {
  @DtoAttr()
  id: string;

  @DtoAttr()
  deliveryId: string;

  @DtoAttr()
  actorType: string;

  @DtoAttr()
  actorId?: string | null;

  @DtoAttr()
  fromStatus?: string | null;

  @DtoAttr()
  toStatus: string;

  @DtoAttr()
  metadata?: any;

  @DtoAttr()
  createdAt: Date;

  entity$?: GenericDto<DeliveryEventDto, DeliveryEvent>;
}
