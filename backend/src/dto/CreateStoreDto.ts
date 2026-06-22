/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: CreateStoreDto.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

export interface CreateStoreDto {
  name: string;
  ownerId: string;
  slug?: string;
  logoUrl?: string;
  logoFile?: string | null;
  bannerUrl?: string;
  bannerFile?: string | null;
  bannerPosition?: 'center' | 'top';
  description?: string;
  primaryColor: string;
  secondaryColor?: string;
  pixKey?: string;
  contactEmail?: string;
  storePhone?: string;
  promoMessage?: string;
  isOrderingEnabled?: boolean;
  segment?: string;
  deliveryRadiusKm?: number;
  deliveryFee?: number;
  postalEnabled?: boolean;
  postalOriginZip?: string;
  orderNotificationSound?: string;
  orderNotificationSoundDuration?: number;
  prepBaseMinutes?: number;
  prepAttentionMinutes?: number;
  reservationCapacity?: number | null;
  address?: string;
  city?: string;
  state?: string;
  lat?: number;
  lng?: number;
  socialLinks?: { type: string; value: string }[];
  openingHours?: any[];
  orderTypes?: string[];
  tableServiceSettings?: Record<string, unknown> | null;
  acquisitionAttribution?: Record<string, unknown> | null;
}
