import { Motoboy } from '../../entities/Motoboy';
import { DtoAttr, DtosEntity, GenericDto } from '../../decorators/decoratos.dto';

@DtosEntity(Motoboy)
export class MotoboyDto {
  @DtoAttr()
  id: string;

  @DtoAttr()
  active: boolean;

  @DtoAttr()
  createdAt: Date;

  entity$?: GenericDto<MotoboyDto, Motoboy>;
}
