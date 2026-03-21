import { ProductResponse } from './ProductResponse';

export interface OrderItemResponse {
  id: string;
  quantity: number;
  price: number;
  product: ProductResponse;
}

export interface OrderResponse {
  id: string;
  customerName: string;
  status: string;
  type: string;
  total: number;
  items: OrderItemResponse[];
  createdAt: Date;
}
