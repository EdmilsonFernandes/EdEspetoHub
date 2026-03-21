import { Plan } from '../../entities/Plan';
import { DtoAttr, DtosEntity, GenericDto } from '../../decorators/decoratos.dto';

@DtosEntity(Plan)
export class PlanDto {
  @DtoAttr()
  id: string;

  @DtoAttr()
  name: string;

  @DtoAttr()
  displayName: string;

  @DtoAttr()
  price: number;

  @DtoAttr()
  durationDays: number;

  @DtoAttr()
  enabled: boolean;

  entity$?: GenericDto<PlanDto, Plan>;
}
