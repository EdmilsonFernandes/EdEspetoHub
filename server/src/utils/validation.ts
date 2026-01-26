/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: validation.ts
 * @Date: 2026-01-26
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

type Coordinates = {
  lat: number;
  lng: number;
};

export const isValidAddress = (address?: string): boolean => {
  if (!address) return false;
  return address.trim().length >= 5;
};

export const isValidCoordinates = (coords?: Coordinates): coords is Coordinates => {
  if (!coords) return false;
  const { lat, lng } = coords;
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

export const parseDurationSeconds = (duration?: string): number | null => {
  if (!duration) return null;
  const match = duration.match(/(\d+)s/);
  if (!match) return null;
  return Number(match[1]);
};
