import { describe, it, expect } from 'vitest';
import { deliveryService } from './DeliveryService';

const assertOk = (from: string, to: string) => {
  (deliveryService as any).assertTransition(from, to);
};

const assertFail = (from: string, to: string) => {
  expect(() => (deliveryService as any).assertTransition(from, to)).toThrow();
};

describe('DeliveryService transitions', () => {
  it('AVAILABLE → ACCEPTED', () => assertOk('AVAILABLE', 'ACCEPTED'));
  it('ACCEPTED → PICKED_UP', () => assertOk('ACCEPTED', 'PICKED_UP'));
  it('PICKED_UP → IN_TRANSIT', () => assertOk('PICKED_UP', 'IN_TRANSIT'));
  it('IN_TRANSIT → DELIVERED', () => assertOk('IN_TRANSIT', 'DELIVERED'));

  it('AVAILABLE → DELIVERED should fail', () => assertFail('AVAILABLE', 'DELIVERED'));
  it('DELIVERED → IN_TRANSIT should fail', () => assertFail('DELIVERED', 'IN_TRANSIT'));
  it('ACCEPTED → DELIVERED should fail', () => assertFail('ACCEPTED', 'DELIVERED'));
  it('PICKED_UP → CANCELED should fail', () => assertFail('PICKED_UP', 'CANCELED'));
});
