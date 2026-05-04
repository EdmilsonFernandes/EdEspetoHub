/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: OrderEtaServiceV2.test.ts
 * @Date: 2026-01-28
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { OrderEtaServiceV2 } from './OrderEtaServiceV2';

const createOrder = (overrides: any = {}) => ({
  id: 'order-1',
  type: 'delivery',
  address: 'Rua X, 123',
  createdAt: new Date(),
  items: [{ quantity: 2 }, { quantity: 1 }],
  store: { id: 'store-1', settings: { address: 'Rua Loja, 10' } },
  ...overrides,
});

describe('OrderEtaServiceV2', () => {
  let service: OrderEtaServiceV2;

  beforeAll(() => {
    service = new OrderEtaServiceV2();
    (service as any).persistEstimate = async () => {};
    (service as any).findDeliveryByOrderId = async () => null;
  });

  it('fallback when maps fail — travelMinutes null, confidence low', async () => {
    (service as any).getTravelData = async () => null;
    const eta = await service.calculateForOrder(createOrder(), 1, 'test-1');
    expect(eta.travelMinutes).toBeNull();
    expect(eta.confidence).toBe('low');
  });

  it('default prep minutes >= 15', async () => {
    (service as any).getTravelData = async () => null;
    const eta = await service.calculateForOrder(createOrder(), 1, 'test-2');
    expect(eta.prepMinutes).toBeGreaterThanOrEqual(15);
  });

  it('window calculation is consistent', async () => {
    (service as any).getTravelData = async () => null;
    const eta = await service.calculateForOrder(createOrder(), 1, 'test-3');
    expect(eta.windowMin).toBeLessThanOrEqual(eta.totalMinutes);
    expect(eta.windowMax).toBeGreaterThanOrEqual(eta.totalMinutes);
  });

  it('uses travel data when available', async () => {
    (service as any).getTravelData = async () => ({ distanceKm: 1.5, durationMin: 8 });
    const eta = await service.calculateForOrder(createOrder(), 2, 'test-4');
    expect(eta.travelMinutes).toBe(8);
    expect(eta.distanceKm).toBe(1.5);
    expect(eta.totalMinutes).toBeGreaterThanOrEqual(eta.prepMinutes);
  });
});
