import { Product } from '../../entities/Product';
import { Store } from '../../entities/Store';
import { DtoAttr, DtosEntity, GenericDto } from '../../decorators/decoratos.dto';

@DtosEntity(Product)
export class ProductDto {
  @DtoAttr() id: string;
  @DtoAttr() name: string;
  @DtoAttr() description: string;
  @DtoAttr() price: number;
  @DtoAttr() category: string;
  @DtoAttr() imageUrl: string;
  @DtoAttr() active: boolean;
  @DtoAttr() createdAt: Date;

  @DtoAttr() store: Store;

  entity$?: GenericDto<ProductDto, Product>;
}
