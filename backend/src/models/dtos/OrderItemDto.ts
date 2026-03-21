import { OrderItem } from '../../entities/OrderItem';
import { Product } from '../../entities/Product';
import { Order } from '../../entities/Order';
import { DtoAttr, DtosEntity, GenericDto } from '../../decorators/decoratos.dto';

@DtosEntity(OrderItem)
export class OrderItemDto {
  @DtoAttr() id: string;
  @DtoAttr() quantity: number;
  @DtoAttr() price: number;
  @DtoAttr() cookingPoint?: string;
  @DtoAttr() passSkewer?: boolean;
  @DtoAttr() selectedModifiers?: Array<{ id: string; name: string; price: number; quantity?: number }> | null;
  @DtoAttr() isPrinted?: boolean;

  @DtoAttr() product: Product;
  @DtoAttr() order: Order;

  entity$?: GenericDto<OrderItemDto, OrderItem>;
}
