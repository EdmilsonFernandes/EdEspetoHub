export interface ProductResponse {
  id: string;
  name: string;
  description?: string;
  price: number;
  promoPrice?: number | null;
  promoActive: boolean;
  category?: string;
  imageUrl?: string;
  isFeatured: boolean;
  manageStock: boolean;
  stockQuantity: number;
  lowStockAlert: number;
  active: boolean;
  createdAt: Date;
}
