import { PlatformAdmin } from '../../entities/PlatformAdmin';
import { DtoAttr, DtosEntity, GenericDto } from '../../decorators/decoratos.dto';

@DtosEntity(PlatformAdmin)
export class PlatformAdminDto {
  @DtoAttr() id: string;
  @DtoAttr() username: string;
  @DtoAttr() passwordHash: string;
  @DtoAttr() createdAt: Date;

  entity$?: GenericDto<PlatformAdminDto, PlatformAdmin>;
}
