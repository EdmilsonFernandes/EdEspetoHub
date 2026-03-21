import { deliveryService } from './DeliveryService';

const assertOk = (from: string, to: string) => {
  // Access private helper (unit test only).
  (deliveryService as any).assertTransition(from, to);
};

const assertFail = (from: string, to: string) => {
  try {
    (deliveryService as any).assertTransition(from, to);
  } catch (e: any) {
    return;
  }
  throw new Error(`Expected transition to fail: ${from} -> ${to}`);
};

(() => {
  // Happy path
  assertOk('AVAILABLE', 'ACCEPTED');
  assertOk('ACCEPTED', 'PICKED_UP');
  assertOk('PICKED_UP', 'IN_TRANSIT');
  assertOk('IN_TRANSIT', 'DELIVERED');

  // Invalids
  assertFail('AVAILABLE', 'DELIVERED');
  assertFail('DELIVERED', 'IN_TRANSIT');
  assertFail('ACCEPTED', 'DELIVERED');
  assertFail('PICKED_UP', 'CANCELED');

  console.log('DeliveryService transition tests passed');
})();

