import { MotoboyDocument } from '../../entities/MotoboyDocument';
import { DtoAttr, DtosEntity, GenericDto } from '../../decorators/decoratos.dto';

@DtosEntity(MotoboyDocument)
export class MotoboyDocumentDto {
  @DtoAttr() id: string;
  @DtoAttr() type: string;
  @DtoAttr() status: string;
  @DtoAttr() fileUrl: string;
  @DtoAttr() createdAt: Date;
  entity$?: GenericDto<MotoboyDocumentDto, MotoboyDocument>;
}
