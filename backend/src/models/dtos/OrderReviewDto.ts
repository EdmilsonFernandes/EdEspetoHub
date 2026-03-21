import { OrderReview } from '../../entities/OrderReview';
import { DtoAttr, DtosEntity, GenericDto } from '../../decorators/decoratos.dto';

@DtosEntity(OrderReview)
export class OrderReviewDto {
  @DtoAttr() id: string;
  @DtoAttr() rating: number;
  @DtoAttr() comment: string;
  @DtoAttr() createdAt: Date;
  entity$?: GenericDto<OrderReviewDto, OrderReview>;
}
