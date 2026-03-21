/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: CreateProductDto.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

export interface CreateProductDto {
  name: string;
  price: number;
  promoPrice?: number | null;
  promoActive?: boolean;
  bundlePromoQty?: number | null;
  bundlePromoPrice?: number | null;
  bundlePromoActive?: boolean;
  category?: string;
  description?: string;
  imageUrl?: string;
  imageFile?: string | null;
  isFeatured?: boolean;
  active?: boolean;
  availabilityDays?: string[] | null;
  manageStock?: boolean;
  stockQuantity?: number;
  lowStockAlert?: number;
  modifiers?: any[] | null;
  storeId: string;
}
