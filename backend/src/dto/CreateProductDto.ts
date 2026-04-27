/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: CreateProductDto.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

export interface ProductModifierOptionDto {
  id?: string;
  name: string;
  price: number;
  active?: boolean;
}

export interface CreateProductDto {
  name: string;
  price: number;
  promoPrice?: number;
  promoActive?: boolean;
  bundlePromoQty?: number;
  bundlePromoPrice?: number;
  bundlePromoActive?: boolean;
  category?: string;
  description?: string;
  imageUrl?: string;
  imageFile?: string | null;
  isFeatured?: boolean;
  manageStock?: boolean;
  stockQuantity?: number;
  lowStockAlert?: number;
  weightG?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  active?: boolean;
  availabilityDays?: Record<string, boolean> | null;
  modifiers?: ProductModifierOptionDto[] | null;
  storeId: string;
}
