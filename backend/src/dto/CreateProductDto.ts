export interface CreateProductDto {
  name: string;
  price: number;
  category?: string;
  imageUrl?: string;
  imageFile?: string | null;
  storeId: string;
}
