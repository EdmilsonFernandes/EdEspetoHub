import { PasswordReset } from '../../entities/PasswordReset';
import { User } from '../../entities/User';
import { DtoAttr, DtosEntity, GenericDto } from '../../decorators/decoratos.dto';

@DtosEntity(PasswordReset)
export class PasswordResetDto {
  @DtoAttr() id: string;
  @DtoAttr() tokenHash: string;
  @DtoAttr() expiresAt: Date;
  @DtoAttr() usedAt?: Date | null;
  @DtoAttr() createdAt: Date;

  @DtoAttr() user: User;

  entity$?: GenericDto<PasswordResetDto, PasswordReset>;
}
