/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: productAvailability.ts
 * @Date: 2026-01-24
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type AvailabilityDays = Partial<Record<DayKey, boolean>>;

const DAY_KEYS: DayKey[] = [ 'sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat' ];

/**
 * Resolves the current day key (mon..sun).
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-24
 */
export const resolveDayKey = (now: Date = new Date()): DayKey =>
{
  return DAY_KEYS[now.getDay()];
};

/**
 * Normalizes availability days payload.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-24
 */
export const normalizeAvailabilityDays = (input: unknown): AvailabilityDays | null =>
{
  if (!input || typeof input !== 'object') return null;
  const entries = Object.entries(input as Record<string, unknown>)
    .filter(([key]) => DAY_KEYS.includes(key as DayKey))
    .map(([key, value]) => [ key, Boolean(value) ] as const);

  if (!entries.length) return null;

  const normalized = entries.reduce<AvailabilityDays>((acc, [key, value]) =>
  {
    acc[key as DayKey] = value;
    return acc;
  }, {});

  const hasAny = Object.values(normalized).some(Boolean);
  return hasAny ? normalized : null;
};

/**
 * Validates product availability for today.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-24
 */
export const isProductAvailableToday = (
  product: { active?: boolean; availabilityDays?: AvailabilityDays | null },
  now: Date = new Date()
): boolean =>
{
  if (!product?.active) return false;
  const availability = product.availabilityDays;
  if (!availability || Object.keys(availability).length === 0) return true;
  const key = resolveDayKey(now);
  return availability[key] === true;
};
