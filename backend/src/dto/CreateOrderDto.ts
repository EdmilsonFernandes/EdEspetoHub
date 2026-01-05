export interface CreateOrderItemInput {
  productId: string;
  quantity: number;
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
