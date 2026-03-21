import { AccessLog } from '../../entities/AccessLog';
import { DtoAttr, DtosEntity, GenericDto } from '../../decorators/decoratos.dto';

@DtosEntity(AccessLog)
export class AccessLogDto {
  @DtoAttr() id: string;
  @DtoAttr() userId: string;
  @DtoAttr() storeId: string;
  @DtoAttr() method: string;
  @DtoAttr() path: string;
  @DtoAttr() statusCode: number;
  @DtoAttr() ip: string;
  @DtoAttr() userAgent: string;
  @DtoAttr() createdAt: Date;
  entity$?: GenericDto<AccessLogDto, AccessLog>;
}
