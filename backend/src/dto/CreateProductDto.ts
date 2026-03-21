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

<<<<<<< HEAD
=======
export interface ProductModifierOptionDto {
  id?: string;
  name: string;
  price: number;
  active?: boolean;
}

>>>>>>> main
export interface CreateProductDto {
  name: string;
  price: number;
  promoPrice?: number;
  promoActive?: boolean;
<<<<<<< HEAD
=======
  bundlePromoQty?: number;
  bundlePromoPrice?: number;
  bundlePromoActive?: boolean;
>>>>>>> main
  category?: string;
  description?: string;
  imageUrl?: string;
  imageFile?: string | null;
  isFeatured?: boolean;
<<<<<<< HEAD
=======
  manageStock?: boolean;
  stockQuantity?: number;
  lowStockAlert?: number;
  active?: boolean;
  availabilityDays?: Record<string, boolean> | null;
  modifiers?: ProductModifierOptionDto[] | null;
>>>>>>> main
  storeId: string;
}
