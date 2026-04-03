# API Methods Reference

**Project:** EdEspetoHub API  
**Source of Truth:** `backend/src/routes/index.ts`  
**Prepared by:** Edmilson Lopes  
**Language:** English  
**Last Updated:** 2026-04-03

> This document maps every registered API method and endpoint currently mounted under `/api` (except root health and Swagger endpoints).

## Conventions
- **Auth column** summarizes middleware requirements from route definitions.
- **Method Purpose** is a concise behavior description aligned to each controller handler.
- Aliases are documented as separate entries when they are exposed as different endpoints.

## Authentication

| Method | Endpoint | Auth | Controller Method | Method Purpose |
|---|---|---|---|---|
| POST | `/auth/admin-login` | Public | `AuthController.adminLogin` | Authenticate an admin user for store management access. |
| POST | `/auth/change-password` | JWT Auth | `AuthController.changePassword` | Change password for the currently authenticated account. |
| POST | `/auth/forgot-password` | Public | `AuthController.forgotPassword` | Start password recovery by creating a reset workflow. |
| POST | `/auth/login` | Public | `AuthController.login` | Authenticate a platform user and return session tokens. |
| POST | `/auth/register` | Public | `AuthController.register` | Create a new platform user account. |
| POST | `/auth/resend-verification` | Public | `AuthController.resendVerification` | Send a new email verification message. |
| POST | `/auth/reset-password` | Public | `AuthController.resetPassword` | Complete password reset using a valid reset token. |
| POST | `/auth/signup` | Public | `AuthController.register` | Create a new platform user account. |
| POST | `/auth/super-login` | Public | `AuthController.superAdminLogin` | Authenticate a SUPER_ADMIN user for platform-level access. |
| GET | `/auth/verify-email` | Public | `AuthController.verifyEmail` | Validate and confirm an email verification token. |
| POST | `/auth/verify-email` | Public | `AuthController.verifyEmail` | Validate and confirm an email verification token. |

## Billing, Subscriptions & Payments

| Method | Endpoint | Auth | Controller Method | Method Purpose |
|---|---|---|---|---|
| GET | `/payments/:paymentId` | Public | `PaymentController.getById` | Get payment details by payment ID. |
| GET | `/payments/:paymentId/events` | Public | `PaymentController.getEvents` | Get lifecycle events for a specific payment. |
| POST | `/payments/:paymentId/renew` | Public | `PaymentController.renewFromPayment` | Start renewal flow using an existing payment context. |
| GET | `/plans` | Public | `PlanController.list` | List available subscription plans. |
| GET | `/stores/:storeId/delivery-billing` | JWT Auth \| Roles: ADMIN | `DeliveryBillingController.getCurrent` | Get current delivery billing cycle/summary. |
| POST | `/stores/:storeId/delivery-billing/pay` | JWT Auth \| Roles: ADMIN | `DeliveryBillingController.pay` | Pay pending delivery billing cycle amount. |
| GET | `/stores/:storeId/subscription` | Public | `SubscriptionController.getByStore` | Get current subscription details for a store. |
| POST | `/stores/:storeId/subscription/renew` | JWT Auth \| Roles: ADMIN | `SubscriptionController.createRenewalPayment` | Create a renewal payment for a store subscription. |
| POST | `/subscriptions` | Public | `SubscriptionController.create` | Create a subscription checkout flow. |
| POST | `/subscriptions/:id/renew` | Public | `SubscriptionController.renew` | Renew a subscription instance. |
| PATCH | `/subscriptions/:id/status` | Public | `SubscriptionController.updateStatus` | Update subscription status. |
| POST | `/webhooks/mercadopago` | Public | `PaymentController.mercadoPagoWebhook` | Process Mercado Pago webhook events. |
| POST | `/webhooks/payment-confirmed` | Public | `PaymentController.confirm` | Process internal payment confirmation callback. |

## Catalog, Inventory & Shipping Quotes

| Method | Endpoint | Auth | Controller Method | Method Purpose |
|---|---|---|---|---|
| GET | `/stores/:storeId/categories` | JWT Auth \| Roles: ADMIN, OPERATOR, CHURRASQUEIRO | `ProductController.listCategories` | List categories configured for store products. |
| PATCH | `/stores/:storeId/categories/priority` | JWT Auth \| Roles: ADMIN | `ProductController.setCategoryPriority` | Set category display priority/order. |
| GET | `/stores/:storeId/inventory` | JWT Auth \| Roles: ADMIN, OPERATOR, CHURRASQUEIRO | `ProductController.listInventory` | List inventory quantities by product. |
| GET | `/stores/:storeId/inventory/alerts` | JWT Auth \| Roles: ADMIN, OPERATOR, CHURRASQUEIRO | `ProductController.getInventoryAlerts` | List low-stock and inventory alert signals. |
| GET | `/stores/:storeId/inventory/movements` | JWT Auth \| Roles: ADMIN, OPERATOR, CHURRASQUEIRO | `ProductController.listInventoryMovements` | List inventory movement history entries. |
| POST | `/stores/:storeId/postal/quote` | JWT Auth \| Roles: ADMIN, OPERATOR, CHURRASQUEIRO | `ShippingController.quotePostalByStore` | Quote postal shipping options for internal admin flows. |
| GET | `/stores/:storeId/products` | JWT Auth \| Roles: ADMIN, OPERATOR, CHURRASQUEIRO | `ProductController.list` | List products for store management. |
| POST | `/stores/:storeId/products` | JWT Auth \| Roles: ADMIN | `ProductController.create` | Create a product in the store catalog. |
| DELETE | `/stores/:storeId/products/:productId` | JWT Auth \| Roles: ADMIN | `ProductController.remove` | Delete a product from the catalog. |
| PUT | `/stores/:storeId/products/:productId` | JWT Auth \| Roles: ADMIN | `ProductController.update` | Update a product in the catalog. |
| PATCH | `/stores/:storeId/products/:productId/stock` | JWT Auth \| Roles: ADMIN, OPERATOR, CHURRASQUEIRO | `ProductController.adjustStock` | Adjust stock quantity and register movement reason. |

## Courier (Motoboy) Operations

| Method | Endpoint | Auth | Controller Method | Method Purpose |
|---|---|---|---|---|
| GET | `/couriers/me/active-delivery` | JWT Auth | `MotoboyController.getCurrentOrder` | Get the courier current active delivery. |
| GET | `/couriers/me/stats` | JWT Auth | `MotoboyController.getStats` | Return courier performance and workload stats. |
| POST | `/deliveries/:deliveryId/cancel` | JWT Auth \| Roles: ADMIN | `DeliveryController.cancel` | Cancel a delivery operation by delivery ID. |
| GET | `/motoboy/documents` | JWT Auth | `MotoboyController.listOwnDocuments` | List authenticated courier uploaded documents. |
| POST | `/motoboy/documents` | JWT Auth | `MotoboyController.uploadDocument` | Upload courier KYC/supporting documents. |
| GET | `/motoboy/earnings/today` | JWT Auth | `MotoboyController.getEarningsToday` | Return courier earnings summary for current day. |
| GET | `/motoboy/profile` | JWT Auth | `MotoboyController.getProfile` | Get courier profile settings. |
| PUT | `/motoboy/profile` | JWT Auth | `MotoboyController.updateProfile` | Update courier profile settings. |
| GET | `/motoboy/stats` | JWT Auth | `MotoboyController.getStats` | Return courier performance and workload stats. |
| GET | `/motoboy/store-requests` | JWT Auth | `MotoboyController.listStoreRequests` | List courier requests to join stores. |
| POST | `/motoboy/store-requests` | JWT Auth | `MotoboyController.createStoreRequest` | Create request for courier-to-store linking. |
| POST | `/motoboy/stores/:storeId/leave` | JWT Auth | `MotoboyController.leaveStore` | Remove courier from a linked store. |
| GET | `/stores/:storeId/motoboys` | JWT Auth \| Roles: ADMIN \| Feature: motoboyManagement | `MotoboyController.listByStore` | List couriers linked to a store. |
| POST | `/stores/:storeId/motoboys` | JWT Auth \| Roles: ADMIN \| Feature: motoboyManagement | `MotoboyController.createForStore` | Create/register courier under a store owner account. |
| POST | `/stores/:storeId/motoboys/:motoboyId/approve` | JWT Auth \| Roles: ADMIN \| Feature: motoboyManagement | `MotoboyController.approve` | Approve courier availability/relationship in store context. |
| GET | `/stores/:storeId/motoboys/:motoboyId/documents` | JWT Auth \| Roles: ADMIN \| Feature: motoboyManagement | `MotoboyController.listDocuments` | List courier documents from store-owner perspective. |
| POST | `/stores/:storeId/motoboys/:motoboyId/documents/:documentId/reupload` | JWT Auth \| Roles: ADMIN \| Feature: motoboyManagement | `MotoboyController.requestDocumentReupload` | Request reupload for a courier document. |
| POST | `/stores/:storeId/motoboys/:motoboyId/link` | JWT Auth \| Roles: ADMIN \| Feature: motoboyManagement | `MotoboyController.linkStore` | Link an existing courier to a store. |
| POST | `/stores/:storeId/motoboys/:motoboyId/suspend` | JWT Auth \| Roles: ADMIN \| Feature: motoboyManagement | `MotoboyController.suspend` | Suspend courier-store relationship. |
| POST | `/stores/:storeId/motoboys/:motoboyId/unlink` | JWT Auth \| Roles: ADMIN \| Feature: motoboyManagement | `MotoboyController.unlinkStore` | Unlink courier from a store. |

## Customer Account

| Method | Endpoint | Auth | Controller Method | Method Purpose |
|---|---|---|---|---|
| GET | `/customer/addresses` | JWT Auth \| Roles: CUSTOMER | `CustomerAccountController.listAddresses` | List saved customer delivery addresses. |
| POST | `/customer/addresses` | JWT Auth \| Roles: CUSTOMER | `CustomerAccountController.createAddress` | Create a new saved customer address. |
| DELETE | `/customer/addresses/:addressId` | JWT Auth \| Roles: CUSTOMER | `CustomerAccountController.deleteAddress` | Delete a saved customer address. |
| PATCH | `/customer/addresses/:addressId` | JWT Auth \| Roles: CUSTOMER | `CustomerAccountController.updateAddress` | Update an existing saved customer address. |
| PATCH | `/customer/addresses/:addressId/default` | JWT Auth \| Roles: CUSTOMER | `CustomerAccountController.setDefaultAddress` | Mark a customer address as default. |
| POST | `/customer/auth/login` | Public | `CustomerAccountController.login` | Authenticate a customer account. |
| POST | `/customer/auth/register` | Public | `CustomerAccountController.register` | Create a customer account for checkout and order history. |
| GET | `/customer/me` | JWT Auth \| Roles: CUSTOMER | `CustomerAccountController.me` | Return current customer profile data. |
| PATCH | `/customer/me` | JWT Auth \| Roles: CUSTOMER | `CustomerAccountController.updateMe` | Update current customer profile data. |
| POST | `/customer/me/change-password` | JWT Auth \| Roles: CUSTOMER | `CustomerAccountController.changePassword` | Change password for the authenticated customer. |
| GET | `/customer/orders` | JWT Auth \| Roles: CUSTOMER | `CustomerAccountController.listOrders` | List orders linked to the authenticated customer. |

## Legal & Compliance

| Method | Endpoint | Auth | Controller Method | Method Purpose |
|---|---|---|---|---|
| GET | `/legal/lgpd` | Public | `LegalController.getLgpd` | Return public LGPD/Privacy policy content. |
| GET | `/legal/terms` | Public | `LegalController.getTerms` | Return public Terms of Service content. |

## Miscellaneous

| Method | Endpoint | Auth | Controller Method | Method Purpose |
|---|---|---|---|---|
| GET | `/stores/:storeId/motoboy-requests` | JWT Auth \| Roles: ADMIN \| Feature: motoboyManagement | `MotoboyController.listStoreRequestsForStore` | List pending courier requests for a store. |
| POST | `/stores/:storeId/motoboy-requests/:requestId/approve` | JWT Auth \| Roles: ADMIN \| Feature: motoboyManagement | `MotoboyController.approveStoreRequest` | Approve a specific courier store request. |
| POST | `/stores/:storeId/motoboy-requests/:requestId/reject` | JWT Auth \| Roles: ADMIN \| Feature: motoboyManagement | `MotoboyController.rejectStoreRequest` | Reject a specific courier store request. |
| GET | `/stores/:storeId/payments` | JWT Auth \| Roles: ADMIN | `PaymentController.listByStore` | List payment records for a store. |

## Orders, Tracking & Reviews

| Method | Endpoint | Auth | Controller Method | Method Purpose |
|---|---|---|---|---|
| POST | `/motoboy/orders/:orderId/accept` | JWT Auth | `MotoboyController.acceptOrder` | Accept a delivery assignment. |
| POST | `/motoboy/orders/:orderId/confirm-payment` | JWT Auth | `MotoboyController.confirmPayment` | Confirm payment collection during delivery flow. |
| POST | `/motoboy/orders/:orderId/delivered` | JWT Auth | `MotoboyController.markDelivered` | Mark order as delivered to customer. |
| POST | `/motoboy/orders/:orderId/finish` | JWT Auth | `MotoboyController.finishOrder` | Finalize courier flow for a delivered order. |
| POST | `/motoboy/orders/:orderId/pickup` | JWT Auth | `MotoboyController.pickupOrder` | Confirm pickup at store and move workflow forward. |
| POST | `/motoboy/orders/:orderId/start` | JWT Auth | `MotoboyController.startDelivery` | Mark delivery route as started. |
| GET | `/motoboy/orders/available` | JWT Auth | `MotoboyController.listAvailableOrders` | List available delivery orders for couriers. |
| GET | `/motoboy/orders/current` | JWT Auth | `MotoboyController.getCurrentOrder` | Get the courier current active delivery. |
| GET | `/motoboy/orders/history` | JWT Auth | `MotoboyController.listHistory` | List courier completed/archived delivery history. |
| GET | `/motoboy/reviews/tip-payouts` | JWT Auth | `OrderReviewController.listTipPayoutsForMotoboy` | List tip payout entries visible to courier. |
| PATCH | `/orders/:orderId` | JWT Auth \| Roles: ADMIN, OPERATOR, CHURRASQUEIRO | `OrderController.updateItems` | Update editable order items and quantities. |
| PATCH | `/orders/:orderId/fulfillment-mode` | JWT Auth \| Roles: ADMIN, OPERATOR, CHURRASQUEIRO | `OrderController.updateFulfillmentMode` | Switch fulfillment mode (distance/postal/table/pickup context). |
| PATCH | `/orders/:orderId/mark-as-printed` | JWT Auth \| Roles: ADMIN, OPERATOR, CHURRASQUEIRO | `OrderController.markItemsAsPrinted` | Mark order items as printed for production workflow. |
| PATCH | `/orders/:orderId/postal` | JWT Auth \| Roles: ADMIN, OPERATOR, CHURRASQUEIRO | `OrderController.updatePostalShipment` | Update postal shipment metadata (service/tracking/status). |
| GET | `/orders/:orderId/public` | Public | `OrderController.getPublic` | Return public-safe order snapshot for customer tracking. |
| PATCH | `/orders/:orderId/reopen` | JWT Auth \| Roles: ADMIN, OPERATOR, CHURRASQUEIRO | `OrderController.reopen` | Reopen a closed/finalized order when allowed. |
| GET | `/orders/:orderId/review` | Public | `OrderReviewController.getByOrder` | Get review data associated with an order. |
| POST | `/orders/:orderId/review` | Public | `OrderReviewController.submitByOrder` | Submit customer review for an order. |
| PATCH | `/orders/:orderId/status` | JWT Auth \| Roles: ADMIN, OPERATOR, CHURRASQUEIRO | `OrderController.updateStatus` | Update operational status for an order. |
| GET | `/stores/:storeId/orders` | JWT Auth \| Roles: ADMIN, OPERATOR, CHURRASQUEIRO | `OrderController.list` | List orders by store ID for queue/history operations. |
| POST | `/stores/:storeId/orders` | Active Subscription \| Optional Auth Context | `OrderController.create` | Create a new order using store ID checkout flow. |
| GET | `/stores/:storeId/reviews` | JWT Auth \| Roles: ADMIN, CHURRASQUEIRO | `OrderReviewController.listByStore` | List store reviews for operational analysis. |
| PATCH | `/stores/:storeId/reviews/:reviewId/tip-payout` | JWT Auth \| Roles: ADMIN, CHURRASQUEIRO \| Feature: tipPayouts | `OrderReviewController.markTipPayoutByStore` | Mark a tip payout request as processed. |
| GET | `/stores/:storeId/reviews/summary` | JWT Auth \| Roles: ADMIN, CHURRASQUEIRO | `OrderReviewController.summaryByStore` | Return aggregated review KPIs for a store. |
| GET | `/stores/:storeId/reviews/tip-payouts` | JWT Auth \| Roles: ADMIN, CHURRASQUEIRO \| Feature: tipPayouts | `OrderReviewController.listTipPayoutsByStore` | List tip payout requests for store approval. |
| GET | `/v2/orders/:orderId/tracking` | Public | `OrderController.getTrackingV2` | Return normalized order tracking timeline (v2 payload). |

## Platform Administration (SUPER_ADMIN)

| Method | Endpoint | Auth | Controller Method | Method Purpose |
|---|---|---|---|---|
| GET | `/admin/access-logs` | JWT Auth \| Roles: SUPER_ADMIN | `PlatformAdminController.listAccessLogs` | List API access logs for platform auditing. |
| GET | `/admin/motoboys/:motoboyId/documents` | JWT Auth \| Roles: SUPER_ADMIN | `MotoboyKycController.listMotoboyDocuments` | List uploaded KYC documents for one courier. |
| POST | `/admin/motoboys/:motoboyId/documents/:documentId/approve` | JWT Auth \| Roles: SUPER_ADMIN | `MotoboyKycController.approveDocument` | Approve a courier KYC document. |
| POST | `/admin/motoboys/:motoboyId/documents/:documentId/reject` | JWT Auth \| Roles: SUPER_ADMIN | `MotoboyKycController.rejectDocument` | Reject a courier KYC document. |
| GET | `/admin/motoboys/kyc/audit` | JWT Auth \| Roles: SUPER_ADMIN | `MotoboyKycController.auditSummary` | Return KYC audit summary for couriers. |
| GET | `/admin/motoboys/kyc/pending` | JWT Auth \| Roles: SUPER_ADMIN | `MotoboyKycController.listPending` | List pending KYC document reviews. |
| GET | `/admin/motoboys/kyc/reviews` | JWT Auth \| Roles: SUPER_ADMIN | `MotoboyKycController.listRecentReviews` | List recently reviewed KYC submissions. |
| GET | `/admin/overview` | JWT Auth \| Roles: SUPER_ADMIN | `PlatformAdminController.overview` | Return consolidated platform KPIs for SUPER_ADMIN. |
| GET | `/admin/payment-events` | JWT Auth \| Roles: SUPER_ADMIN | `PlatformAdminController.listPaymentEvents` | List global payment events for auditing. |
| POST | `/admin/payments/:paymentId/reprocess` | JWT Auth \| Roles: SUPER_ADMIN | `PaymentController.reprocess` | Reprocess a payment event manually (admin operation). |
| GET | `/admin/queue-health` | JWT Auth \| Roles: SUPER_ADMIN | `PlatformAdminController.queueHealth` | Return queue health and processing indicators. |
| POST | `/admin/site-settings` | JWT Auth \| Roles: SUPER_ADMIN | `LegalController.setSetting` | Upsert legal/site setting content (admin). |
| GET | `/admin/stores` | JWT Auth \| Roles: SUPER_ADMIN | `PlatformAdminController.listStores` | List stores with platform-level operational metadata. |
| PATCH | `/admin/stores/:storeId/plan-exempt` | JWT Auth \| Roles: SUPER_ADMIN | `PlatformAdminController.updatePlanExempt` | Update plan exemption status for a store. |
| PATCH | `/admin/stores/:storeId/reactivate` | JWT Auth \| Roles: SUPER_ADMIN | `PlatformAdminController.reactivateStore` | Reactivate a previously suspended store. |
| PATCH | `/admin/stores/:storeId/suspend` | JWT Auth \| Roles: SUPER_ADMIN | `PlatformAdminController.suspendStore` | Suspend a store account at platform level. |

## Public Storefront

| Method | Endpoint | Auth | Controller Method | Method Purpose |
|---|---|---|---|---|
| GET | `/chamanoespeto/:slug` | Public | `StoreController.getBySlug` | Return public store details by slug. |
| GET | `/janocaminho/:slug` | Public | `StoreController.getBySlug` | Return public store details by slug. |
| GET | `/public/platform/metrics` | Public | `PlatformPublicController.metrics` | Return public platform metrics for landing pages. |
| GET | `/public/stores` | Public | `StoreController.listPortfolio` | List publicly visible stores for portfolio showcase. |
| GET | `/public/stores/slug/:slug/categories` | Public | `ProductController.listPublicCategoriesBySlug` | List public product categories by store slug. |
| GET | `/public/stores/slug/:slug/highlights` | Public | `OrderController.listHighlightsBySlug` | Return public highlights for store landing/catalog view. |
| POST | `/public/stores/slug/:slug/postal/quote` | Public | `ShippingController.quotePostalPublicBySlug` | Quote postal shipping options for a public store cart. |
| GET | `/public/stores/slug/:slug/products` | Public | `ProductController.listPublicBySlug` | List publicly visible products by store slug. |
| GET | `/public/stores/slug/:slug/tables/status` | Public | `OrderController.listTableStatusBySlug` | Return public table occupancy/status information by slug. |
| POST | `/public/stores/slug/:slug/track` | Public | `StoreController.trackLink` | Track a public store link click/conversion event. |
| GET | `/stores/slug/:slug` | Public | `StoreController.getBySlug` | Return public store details by slug. |
| GET | `/stores/slug/:slug/categories` | Public | `ProductController.listPublicCategoriesBySlug` | List public product categories by store slug. |
| GET | `/stores/slug/:slug/orders` | JWT Auth \| Roles: ADMIN, OPERATOR, CHURRASQUEIRO | `OrderController.listBySlug` | List orders by store slug for queue/history operations. |
| POST | `/stores/slug/:slug/orders` | Active Subscription \| Optional Auth Context | `OrderController.createBySlug` | Create a new order using store slug checkout flow. |
| POST | `/stores/slug/:slug/postal/quote` | Public | `ShippingController.quotePostalPublicBySlug` | Quote postal shipping options for a public store cart. |
| GET | `/stores/slug/:slug/products` | Public | `ProductController.listPublicBySlug` | List publicly visible products by store slug. |

## Store Administration

| Method | Endpoint | Auth | Controller Method | Method Purpose |
|---|---|---|---|---|
| PUT | `/stores/:storeId` | JWT Auth \| Roles: ADMIN | `StoreController.update` | Update store settings and profile data. |
| GET | `/stores/:storeId/link-stats` | JWT Auth \| Roles: ADMIN | `StoreController.getLinkStats` | Return store link traffic and conversion stats. |
| PUT | `/stores/:storeId/status` | JWT Auth \| Roles: ADMIN | `StoreController.updateStatus` | Toggle store operational status (open/closed). |
| GET | `/stores/:storeId/users` | JWT Auth \| Roles: ADMIN | `StoreUserController.list` | List admin/operator users linked to a store. |
| POST | `/stores/:storeId/users` | JWT Auth \| Roles: ADMIN | `StoreUserController.create` | Create a new store staff account. |
| DELETE | `/stores/:storeId/users/:userId` | JWT Auth \| Roles: ADMIN | `StoreUserController.remove` | Remove a user from store access. |
| PATCH | `/stores/:storeId/users/:userId/password` | JWT Auth \| Roles: ADMIN | `StoreUserController.updatePassword` | Update password for a store user account. |

## API Prefix Reminder

- Application mounts routes under `app.use("/api", routes)` in `backend/src/app.ts`.
- Example: route `GET /plans` is effectively exposed as `GET /api/plans`.
- Docs runtime endpoints: `GET /api/docs` and `GET /api/docs.json`.
