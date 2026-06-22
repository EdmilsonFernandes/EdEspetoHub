import baselineCurrentSchema from './20260613_000_baseline_current_schema';
import ordersReservationFields from './20260622_001_orders_reservation_fields';

export const schemaMigrations = [baselineCurrentSchema, ordersReservationFields] as const;
