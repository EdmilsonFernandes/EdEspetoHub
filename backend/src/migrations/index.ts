import baselineCurrentSchema from './20260613_000_baseline_current_schema';
import ordersReservationFields from './20260622_001_orders_reservation_fields';
import storeReservationCapacity from './20260622_002_store_reservation_capacity';
import storeReservationLeadTime from './20260622_003_store_reservation_lead_time';
import partnerAccountUserLink from './20260625_001_partner_account_user_link';

export const schemaMigrations = [
  baselineCurrentSchema,
  ordersReservationFields,
  storeReservationCapacity,
  storeReservationLeadTime,
  partnerAccountUserLink,
] as const;
