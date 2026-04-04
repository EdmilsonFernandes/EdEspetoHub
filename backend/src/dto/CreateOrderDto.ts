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

export interface SelectedModifierInput {
  id?: string;
  name?: string;
  price?: number;
  quantity?: number;
}

export interface CreateOrderItemInput {
  productId: string;
  quantity: number;
  cookingPoint?: string;
  passSkewer?: boolean;
  selectedModifiers?: SelectedModifierInput[];
  isPrinted?: boolean;
}

export interface CreateOrderDto {
  customerName: string;
  customerUserId?: string | null;
  guestPushId?: string | null;
  phone?: string;
  address?: string;
  table?: string;
  type: string;
  fulfillmentMode?: 'distance' | 'postal' | string;
  paymentMethod?: string;
  paymentStatus?: string;
  cashTendered?: number;
  deliveryFee?: number;
  postalShipment?: {
    provider?: string;
    serviceCode?: string;
    serviceName?: string;
    estimatedDays?: number;
    price?: number;
    currency?: string;
    originZip?: string;
    destinationZip?: string;
  };
  items: CreateOrderItemInput[];
  storeId: string;
}
