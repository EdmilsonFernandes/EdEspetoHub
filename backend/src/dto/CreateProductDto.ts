export interface CreateProductDto {
  name: string;
  price: number;
  category?: string;
  description?: string;
  imageUrl?: string;
  imageFile?: string | null;
  storeId: string;
}
