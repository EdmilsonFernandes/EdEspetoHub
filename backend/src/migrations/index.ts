import baselineCurrentSchema from './20260613_000_baseline_current_schema';
import ordersReservationFields from './20260622_001_orders_reservation_fields';
import storeReservationCapacity from './20260622_002_store_reservation_capacity';
import storeReservationLeadTime from './20260622_003_store_reservation_lead_time';
import partnerAccountUserLink from './20260625_001_partner_account_user_link';
import userIdentifiers from './20260626_001_user_identifiers';
import userDocuments from './20260626_002_user_documents';
import whitelabelUsers from './20260626_003_whitelabel_users';
import whitelabelProfileLinks from './20260626_004_whitelabel_profile_links';
import customerAddressCondominium from './20260812_001_customer_address_condominium';
import storeCondominiumPickupLocation from './20260813_001_store_condominium_pickup_location';
import orderCondominiumPickupLocation from './20260813_002_order_condominium_pickup_location';
import orderOrigin from './20260816_001_order_origin';
import orderReviewReply from './20260816_002_order_review_reply';
import checkoutExtras from './20260816_003_checkout_extras';
import planosFundador from './20260828_001_planos_fundador';

export const schemaMigrations = [
  baselineCurrentSchema,
  ordersReservationFields,
  storeReservationCapacity,
  storeReservationLeadTime,
  partnerAccountUserLink,
  userIdentifiers,
  userDocuments,
  whitelabelUsers,
  whitelabelProfileLinks,
  customerAddressCondominium,
  storeCondominiumPickupLocation,
  orderCondominiumPickupLocation,
  orderOrigin,
  orderReviewReply,
  checkoutExtras,
  planosFundador,
] as const;
