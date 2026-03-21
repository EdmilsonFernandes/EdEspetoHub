import { Store } from '../../entities/Store';
import { User } from '../../entities/User';
import { StoreSettings } from '../../entities/StoreSettings';
import { Product } from '../../entities/Product';
import { Order } from '../../entities/Order';
import { Subscription } from '../../entities/Subscription';
import { DtoAttr, DtosEntity, GenericDto } from '../../decorators/decoratos.dto';

@DtosEntity(Store)
export class StoreDto {
  @DtoAttr() id: string;
  @DtoAttr() name: string;
  @DtoAttr() slug: string;
  @DtoAttr() open: boolean;
  @DtoAttr() createdAt: Date;

  @DtoAttr() owner: User;
  @DtoAttr() settings: StoreSettings;
  @DtoAttr() products: Product[];
  @DtoAttr() orders: Order[];
  @DtoAttr() subscriptions: Subscription[];

  entity$?: GenericDto<StoreDto, Store>;
}
