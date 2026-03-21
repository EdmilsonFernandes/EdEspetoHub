import { StoreLinkHit } from '../../entities/StoreLinkHit';
import { Store } from '../../entities/Store';
import { DtoAttr, DtosEntity, GenericDto } from '../../decorators/decoratos.dto';

@DtosEntity(StoreLinkHit)
export class StoreLinkHitDto {
  @DtoAttr() id: string;
  @DtoAttr() storeId: string;
  @DtoAttr() utmSource?: string | null;
  @DtoAttr() utmMedium?: string | null;
  @DtoAttr() utmCampaign?: string | null;
  @DtoAttr() referrer?: string | null;
  @DtoAttr() createdAt: Date;

  @DtoAttr() store: Store;

  entity$?: GenericDto<StoreLinkHitDto, StoreLinkHit>;
}
