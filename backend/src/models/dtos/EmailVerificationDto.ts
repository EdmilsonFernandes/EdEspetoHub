import { EmailVerification } from '../../entities/EmailVerification';
import { User } from '../../entities/User';
import { DtoAttr, DtosEntity, GenericDto } from '../../decorators/decoratos.dto';

@DtosEntity(EmailVerification)
export class EmailVerificationDto {
  @DtoAttr() id: string;
  @DtoAttr() tokenHash: string;
  @DtoAttr() expiresAt: Date;
  @DtoAttr() usedAt?: Date | null;
  @DtoAttr() requestIp?: string | null;
  @DtoAttr() resendCount: number;
  @DtoAttr() lastSentAt?: Date | null;
  @DtoAttr() createdAt: Date;

  @DtoAttr() user: User;

  entity$?: GenericDto<EmailVerificationDto, EmailVerification>;
}
