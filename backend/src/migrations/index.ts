import baselineCurrentSchema from './20260613_000_baseline_current_schema';
import ordersReservationFields from './20260622_001_orders_reservation_fields';
import storeReservationCapacity from './20260622_002_store_reservation_capacity';

export const schemaMigrations = [
  baselineCurrentSchema,
  ordersReservationFields,
  storeReservationCapacity,
] as const;
