import { StoreUser } from '../../entities/StoreUser';
import { DtoAttr, DtosEntity, GenericDto } from '../../decorators/decoratos.dto';

@DtosEntity(StoreUser)
export class StoreUserDto {
  @DtoAttr() id: string;
  @DtoAttr() role: string;
  @DtoAttr() isActive: boolean;
  @DtoAttr() createdAt: Date;
  entity$?: GenericDto<StoreUserDto, StoreUser>;
}
