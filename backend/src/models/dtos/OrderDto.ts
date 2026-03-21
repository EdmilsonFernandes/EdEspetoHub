import { Order } from '../../entities/Order';
import { Store } from '../../entities/Store';
import { OrderItem } from '../../entities/OrderItem';
import { DtoAttr, DtosEntity, GenericDto } from '../../decorators/decoratos.dto';

@DtosEntity(Order)
export class OrderDto {
  @DtoAttr() id: string;
  @DtoAttr() customerName: string;
  @DtoAttr() status: string;
  @DtoAttr() type: string;
  @DtoAttr() total: number;
  @DtoAttr() createdAt: Date;

  @DtoAttr() store: Store;
  @DtoAttr() items: OrderItem[];

  entity$?: GenericDto<OrderDto, Order>;
}
