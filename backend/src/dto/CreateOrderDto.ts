/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: CreateOrderDto.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
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
  actorRole?: string | null;
  clientIp?: string | null;
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
  condominiumOrder?: {
    condominiumId?: string;
    condominiumSlug?: string;
    eventId?: string;
    fulfillmentMode?: 'pickup_at_stall' | 'apartment_delivery' | string;
    block?: string;
    tower?: string;
    apartment?: string;
    reference?: string;
  };
  items: CreateOrderItemInput[];
  storeId: string;
}
