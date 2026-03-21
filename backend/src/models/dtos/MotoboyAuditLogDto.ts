import { MotoboyAuditLog } from '../../entities/MotoboyAuditLog';
import { DtoAttr, DtosEntity, GenericDto } from '../../decorators/decoratos.dto';

@DtosEntity(MotoboyAuditLog)
export class MotoboyAuditLogDto {
  @DtoAttr() id: string;
  @DtoAttr() storeId?: string | null;
  @DtoAttr() motoboyId?: string | null;
  @DtoAttr() action: string;
  @DtoAttr() performedByUserId?: string | null;
  @DtoAttr() metadata?: Record<string, any> | null;
  @DtoAttr() createdAt: Date;

  entity$?: GenericDto<MotoboyAuditLogDto, MotoboyAuditLog>;
}
