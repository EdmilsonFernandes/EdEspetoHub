/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: CreateOrderDto.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

<<<<<<< HEAD
=======
export interface SelectedModifierInput {
  id?: string;
  name?: string;
  price?: number;
  quantity?: number;
}

>>>>>>> main
export interface CreateOrderItemInput {
  productId: string;
  quantity: number;
  cookingPoint?: string;
  passSkewer?: boolean;
<<<<<<< HEAD
=======
  selectedModifiers?: SelectedModifierInput[];
  isPrinted?: boolean;
>>>>>>> main
}

export interface CreateOrderDto {
  customerName: string;
  phone?: string;
  address?: string;
  table?: string;
  type: string;
  paymentMethod?: string;
<<<<<<< HEAD
  items: CreateOrderItemInput[];
  storeId: string;
}
=======
  paymentStatus?: string;
  cashTendered?: number;
  deliveryFee?: number;
  items: CreateOrderItemInput[];
  storeId: string;
}
>>>>>>> main
