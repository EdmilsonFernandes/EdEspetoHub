import { OrderDelivery } from '../../entities/OrderDelivery';
import { DtoAttr, DtosEntity, GenericDto } from '../../decorators/decoratos.dto';

@DtosEntity(OrderDelivery)
export class OrderDeliveryDto {
  @DtoAttr() orderId: string;
  @DtoAttr() motoboyId: string;
  @DtoAttr() status: string;
  @DtoAttr() freightValue: number;
  @DtoAttr() acceptedAt: Date;
  @DtoAttr() pickedUpAt: Date;
  @DtoAttr() inTransitAt: Date;
  @DtoAttr() deliveredAt: Date;
  @DtoAttr() expiresAt: Date;
  entity$?: GenericDto<OrderDeliveryDto, OrderDelivery>;
}
