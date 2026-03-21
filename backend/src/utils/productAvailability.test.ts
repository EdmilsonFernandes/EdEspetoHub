/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: productAvailability.test.ts
 * @Date: 2026-01-24
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import assert from 'assert';
import { AvailabilityDays, isProductAvailableToday } from './productAvailability';

const monday = new Date('2025-01-06T12:00:00Z');
const sunday = new Date('2025-01-05T12:00:00Z');

const run = () => {
  assert.strictEqual(
    isProductAvailableToday({ active: false }, monday),
    false,
    'inactive product should be unavailable'
  );

  assert.strictEqual(
    isProductAvailableToday({ active: true, availabilityDays: null }, monday),
    true,
    'active product with null availability should be available'
  );

  const allowed: AvailabilityDays = { mon: true, tue: false };
  assert.strictEqual(
    isProductAvailableToday({ active: true, availabilityDays: allowed }, monday),
    true,
    'active product with allowed day should be available'
  );

  const blocked: AvailabilityDays = { sun: false, mon: false };
  assert.strictEqual(
    isProductAvailableToday({ active: true, availabilityDays: blocked }, sunday),
    false,
    'active product with blocked day should be unavailable'
  );
};

run();
console.log('productAvailability tests passed');
