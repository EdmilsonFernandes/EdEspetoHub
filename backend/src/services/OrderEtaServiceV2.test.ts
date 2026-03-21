/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: OrderEtaServiceV2.test.ts
 * @Date: 2026-01-28
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import assert from 'assert';
import { OrderEtaServiceV2 } from './OrderEtaServiceV2';

const createOrder = (overrides: any = {}) => ({
  id: 'order-1',
  type: 'delivery',
  address: 'Rua X, 123',
  createdAt: new Date(),
  items: [
    { quantity: 2 },
    { quantity: 1 },
  ],
  store: {
    id: 'store-1',
    settings: {
      address: 'Rua Loja, 10',
    },
  },
  ...overrides,
});

async function run() {
  const service = new OrderEtaServiceV2();
  (service as any).persistEstimate = async () => {};

  // 1) fallback when maps fail
  (service as any).getTravelData = async () => null;
  const etaFallback = await service.calculateForOrder(createOrder(), 1, 'test-1');
  assert.strictEqual(etaFallback.travelMinutes, null);
  assert.strictEqual(etaFallback.confidence, 'low');

  // 2) default prep minutes
  const etaDefaultPrep = await service.calculateForOrder(createOrder(), 1, 'test-2');
  assert.ok(etaDefaultPrep.prepMinutes >= 15, 'prep should use default base');

  // 3) window calculation
  const etaWindow = await service.calculateForOrder(createOrder(), 1, 'test-3');
  assert.ok(etaWindow.windowMin <= etaWindow.totalMinutes);
  assert.ok(etaWindow.windowMax >= etaWindow.totalMinutes);

  // 4) active + allowed travel
  (service as any).getTravelData = async () => ({ distanceKm: 1.5, durationMin: 8 });
  const etaTravel = await service.calculateForOrder(createOrder(), 2, 'test-4');
  assert.strictEqual(etaTravel.travelMinutes, 8);
  assert.strictEqual(etaTravel.distanceKm, 1.5);
  assert.ok(etaTravel.totalMinutes >= etaTravel.prepMinutes);

  console.log('OrderEtaServiceV2 tests passed.');
}

run().catch((error) => {
  console.error('OrderEtaServiceV2 tests failed', error);
  process.exit(1);
});
