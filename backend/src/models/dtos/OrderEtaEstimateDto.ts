import { OrderEtaEstimate } from '../../entities/OrderEtaEstimate';
import { DtoAttr, DtosEntity, GenericDto } from '../../decorators/decoratos.dto';

@DtosEntity(OrderEtaEstimate)
export class OrderEtaEstimateDto {
  @DtoAttr() id: string;
  @DtoAttr() estimateMinutes: number;
  @DtoAttr() createdAt: Date;
  entity$?: GenericDto<OrderEtaEstimateDto, OrderEtaEstimate>;
}
