import { MotoboyStore } from '../../entities/MotoboyStore';
import { DtoAttr, DtosEntity, GenericDto } from '../../decorators/decoratos.dto';

@DtosEntity(MotoboyStore)
export class MotoboyStoreDto {
  @DtoAttr() id: string;
  @DtoAttr() active: boolean;
  @DtoAttr() createdAt: Date;
  entity$?: GenericDto<MotoboyStoreDto, MotoboyStore>;
}
