import { MotoboyStoreRequest } from '../../entities/MotoboyStoreRequest';
import { Motoboy } from '../../entities/Motoboy';
import { Store } from '../../entities/Store';
import { User } from '../../entities/User';
import { DtoAttr, DtosEntity, GenericDto } from '../../decorators/decoratos.dto';

@DtosEntity(MotoboyStoreRequest)
export class MotoboyStoreRequestDto {
  @DtoAttr() id: string;
  @DtoAttr() motoboyId: string;
  @DtoAttr() storeId: string;
  @DtoAttr() status: string;
  @DtoAttr() decidedByUserId?: string | null;
  @DtoAttr() reason?: string | null;
  @DtoAttr() decidedAt?: Date | null;
  @DtoAttr() createdAt: Date;

  @DtoAttr() motoboy: Motoboy;
  @DtoAttr() store: Store;
  @DtoAttr() decidedBy: User;

  entity$?: GenericDto<MotoboyStoreRequestDto, MotoboyStoreRequest>;
}
