export interface CreateProductDto {
  name: string;
  price: number;
  category?: string;
  imageUrl?: string;
  storeId: string;
}
