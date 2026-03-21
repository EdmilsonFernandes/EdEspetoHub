import { StoreSettings } from '../../entities/StoreSettings';
import { Store } from '../../entities/Store';
import { DtoAttr, DtosEntity, GenericDto } from '../../decorators/decoratos.dto';
import { SocialLink } from '../../utils/BusinessUtil';

@DtosEntity(StoreSettings)
export class StoreSettingsDto {
  @DtoAttr() id: string;
  @DtoAttr() logoUrl?: string | null;
  @DtoAttr() bannerUrl?: string | null;
  @DtoAttr() bannerPosition?: string | null;
  @DtoAttr() description?: string | null;
  @DtoAttr() address?: string | null;
  @DtoAttr() city?: string | null;
  @DtoAttr() state?: string | null;
  @DtoAttr() primaryColor: string;
  @DtoAttr() secondaryColor?: string | null;
  @DtoAttr() pixKey?: string | null;
  @DtoAttr() contactEmail?: string | null;
  @DtoAttr() promoMessage?: string | null;
  @DtoAttr() isOrderingEnabled: boolean;
  @DtoAttr() segment?: string | null;
  @DtoAttr() categoryPriorities?: Record<string, number> | null;
  @DtoAttr() prepBaseMinutes?: number | null;
  @DtoAttr() prepPerItemMinutes?: number | null;
  @DtoAttr() queueCapacityPerHour?: number | null;
  @DtoAttr() queueBufferMinutes?: number | null;
  @DtoAttr() etaBufferMinutes?: number | null;
  @DtoAttr() planExempt: boolean;
  @DtoAttr() planExemptLabel?: string | null;
  @DtoAttr() deliveryRadiusKm?: number | null;
  @DtoAttr() deliveryFee?: number | null;
  @DtoAttr() socialLinks?: SocialLink[];
  @DtoAttr() openingHours?: any[];
  @DtoAttr() orderTypes?: string[];

  @DtoAttr() store: Store;

  entity$?: GenericDto<StoreSettingsDto, StoreSettings>;
}
