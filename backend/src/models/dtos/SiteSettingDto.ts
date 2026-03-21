import { SiteSetting } from '../../entities/SiteSetting';
import { DtoAttr, DtosEntity, GenericDto } from '../../decorators/decoratos.dto';

@DtosEntity(SiteSetting)
export class SiteSettingDto {
  @DtoAttr() id: string;
  @DtoAttr() key: string;
  @DtoAttr() value: string;
  @DtoAttr() createdAt: Date;
  entity$?: GenericDto<SiteSettingDto, SiteSetting>;
}
