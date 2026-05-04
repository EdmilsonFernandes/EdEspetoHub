/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: productAvailability.test.ts
 * @Date: 2026-01-24
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import { describe, it, expect } from 'vitest';
import { AvailabilityDays, isProductAvailableToday } from './productAvailability';

const monday = new Date('2025-01-06T12:00:00Z');
const sunday = new Date('2025-01-05T12:00:00Z');

describe('productAvailability', () => {
  it('inactive product should be unavailable', () => {
    expect(isProductAvailableToday({ active: false }, monday)).toBe(false);
  });

  it('active product with null availability should be available', () => {
    expect(isProductAvailableToday({ active: true, availabilityDays: null }, monday)).toBe(true);
  });

  it('active product with allowed day should be available', () => {
    const allowed: AvailabilityDays = { mon: true, tue: false };
    expect(isProductAvailableToday({ active: true, availabilityDays: allowed }, monday)).toBe(true);
  });

  it('active product with blocked day should be unavailable', () => {
    const blocked: AvailabilityDays = { sun: false, mon: false };
    expect(isProductAvailableToday({ active: true, availabilityDays: blocked }, sunday)).toBe(false);
  });
});
