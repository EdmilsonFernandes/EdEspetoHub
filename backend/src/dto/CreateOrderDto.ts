export interface CreateOrderItemInput {
  productId: string;
  quantity: number;
  cookingPoint?: string;
  passSkewer?: boolean;
}

export interface CreateOrderDto {
  customerName: string;
  phone?: string;
  address?: string;
  table?: string;
  type: string;
  paymentMethod?: string;
  items: CreateOrderItemInput[];
  storeId: string;
}
