import { User } from '../../entities/User';
import { Store } from '../../entities/Store';
import { DtoAttr, DtosEntity, GenericDto } from '../../decorators/decoratos.dto';

@DtosEntity(User)
export class UserDto {
  @DtoAttr() id: string;
  @DtoAttr() fullName: string;
  @DtoAttr() email: string;
  @DtoAttr() phone: string;
  @DtoAttr() address: string;
  @DtoAttr() role: string;
  @DtoAttr() emailVerified: boolean;
  @DtoAttr() profileImageUrl: string;
  @DtoAttr() createdAt: Date;

  @DtoAttr() stores: Store[];

  entity$?: GenericDto<UserDto, User>;
}
