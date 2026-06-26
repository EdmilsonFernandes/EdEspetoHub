import baselineCurrentSchema from './20260613_000_baseline_current_schema';
import ordersReservationFields from './20260622_001_orders_reservation_fields';
import storeReservationCapacity from './20260622_002_store_reservation_capacity';
import storeReservationLeadTime from './20260622_003_store_reservation_lead_time';
import partnerAccountUserLink from './20260625_001_partner_account_user_link';
import userIdentifiers from './20260626_001_user_identifiers';
import userDocuments from './20260626_002_user_documents';
import whitelabelUsers from './20260626_003_whitelabel_users';

export const schemaMigrations = [
  baselineCurrentSchema,
  ordersReservationFields,
  storeReservationCapacity,
  storeReservationLeadTime,
  partnerAccountUserLink,
  userIdentifiers,
  userDocuments,
  whitelabelUsers,
] as const;
