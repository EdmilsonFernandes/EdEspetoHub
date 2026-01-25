/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: CreateStoreDto.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

export interface CreateStoreDto {
  name: string;
  ownerId: string;
  slug?: string;
  logoUrl?: string;
  logoFile?: string | null;
  description?: string;
  primaryColor: string;
  secondaryColor?: string;
  pixKey?: string;
  contactEmail?: string;
  promoMessage?: string;
  deliveryRadiusKm?: number;
  deliveryFee?: number;
  address?: string;
  socialLinks?: { type: string; value: string }[];
  openingHours?: any[];
  orderTypes?: string[];
}
