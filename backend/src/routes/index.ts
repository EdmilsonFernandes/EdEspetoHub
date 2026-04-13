/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: index.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { StoreController } from '../controllers/StoreController';
import { ProductController } from '../controllers/ProductController';
import { OrderController } from '../controllers/OrderController';
import { OrderReviewController } from '../controllers/OrderReviewController';
import { PlanController } from '../controllers/PlanController';
import { SubscriptionController } from '../controllers/SubscriptionController';
import { PlatformAdminController } from '../controllers/PlatformAdminController';
import { PlatformPublicController } from '../controllers/PlatformPublicController';
import { PaymentController } from '../controllers/PaymentController';
import { MotoboyController } from '../controllers/MotoboyController';
import { MotoboyKycController } from '../controllers/MotoboyKycController';
import { DeliveryController } from '../controllers/DeliveryController';
import { LegalController } from '../controllers/LegalController';
import { DeliveryBillingController } from '../controllers/DeliveryBillingController';
import { StoreUserController } from '../controllers/StoreUserController';
import { ShippingController } from '../controllers/ShippingController';
import { CustomerAccountController } from '../controllers/CustomerAccountController';
import { FeaturedProductController } from '../controllers/FeaturedProductController';
import { CondominiumController } from '../controllers/CondominiumController';

import { hydrateAuthOptional, requireAuth, requireRole } from '../middleware/authGuard';
import { requireActiveSubscription } from '../middleware/subscriptionGuard';
import { requirePlanFeature } from '../middleware/planFeatureGuard';

const routes = Router();

// Auth
routes.post('/auth/register', AuthController.register);
routes.post('/auth/signup', AuthController.register);
routes.post('/auth/login', AuthController.login);
routes.post('/auth/admin-login', AuthController.adminLogin);
routes.post('/auth/super-login', AuthController.superAdminLogin);
routes.post('/auth/forgot-password', AuthController.forgotPassword);
routes.post('/auth/reset-password', AuthController.resetPassword);
routes.post('/auth/verify-email', AuthController.verifyEmail);
routes.get('/auth/verify-email', AuthController.verifyEmail);
routes.post('/auth/resend-verification', AuthController.resendVerification);
routes.post('/auth/change-password', requireAuth, AuthController.changePassword);
routes.post('/customer/auth/register', CustomerAccountController.register);
routes.post('/customer/auth/login', CustomerAccountController.login);
routes.get('/customer/me', requireAuth, requireRole('CUSTOMER'), CustomerAccountController.me);
routes.patch('/customer/me', requireAuth, requireRole('CUSTOMER'), CustomerAccountController.updateMe);
routes.patch('/customer/me/deactivate', requireAuth, requireRole('CUSTOMER'), CustomerAccountController.deactivate);
routes.post('/customer/me/change-password', requireAuth, requireRole('CUSTOMER'), CustomerAccountController.changePassword);
routes.get('/customer/orders', requireAuth, requireRole('CUSTOMER'), CustomerAccountController.listOrders);
routes.post('/customer/orders/:orderId/cancel', requireAuth, requireRole('CUSTOMER'), CustomerAccountController.cancelOrder);
routes.post('/customer/push/register', requireAuth, requireRole('CUSTOMER'), CustomerAccountController.registerPushToken);
routes.post('/customer/push/unregister', requireAuth, requireRole('CUSTOMER'), CustomerAccountController.unregisterPushToken);
routes.post('/public/push/register', CustomerAccountController.registerGuestPushToken);
routes.post('/public/push/unregister', CustomerAccountController.unregisterGuestPushToken);
routes.get('/customer/addresses', requireAuth, requireRole('CUSTOMER'), CustomerAccountController.listAddresses);
routes.post('/customer/addresses', requireAuth, requireRole('CUSTOMER'), CustomerAccountController.createAddress);
routes.patch('/customer/addresses/:addressId', requireAuth, requireRole('CUSTOMER'), CustomerAccountController.updateAddress);
routes.patch('/customer/addresses/:addressId/default', requireAuth, requireRole('CUSTOMER'), CustomerAccountController.setDefaultAddress);
routes.delete('/customer/addresses/:addressId', requireAuth, requireRole('CUSTOMER'), CustomerAccountController.deleteAddress);

// Plans / payments
routes.get('/plans', PlanController.list);
routes.post('/subscriptions', SubscriptionController.create);
routes.get('/stores/:storeId/subscription', SubscriptionController.getByStore);
routes.post('/stores/:storeId/subscription/renew', requireAuth, requireRole('ADMIN'), SubscriptionController.createRenewalPayment);
routes.post('/subscriptions/:id/renew', SubscriptionController.renew);
routes.patch('/subscriptions/:id/status', SubscriptionController.updateStatus);
routes.post('/webhooks/payment-confirmed', PaymentController.confirm);
routes.post('/webhooks/mercadopago', PaymentController.mercadoPagoWebhook);
routes.get('/stores/:storeId/payments', requireAuth, requireRole('ADMIN'), PaymentController.listByStore);
routes.get('/payments/:paymentId', PaymentController.getById);
routes.get('/payments/:paymentId/events', PaymentController.getEvents);
routes.post('/payments/:paymentId/renew', PaymentController.renewFromPayment);

// Platform admin (se for painel de plataforma mesmo, proteja)
routes.get('/admin/overview', requireAuth, requireRole('SUPER_ADMIN'), PlatformAdminController.overview);
routes.get('/admin/stores', requireAuth, requireRole('SUPER_ADMIN'), PlatformAdminController.listStores);
routes.get('/admin/queue-health', requireAuth, requireRole('SUPER_ADMIN'), PlatformAdminController.queueHealth);
routes.get('/admin/payment-events', requireAuth, requireRole('SUPER_ADMIN'), PlatformAdminController.listPaymentEvents);
routes.get('/admin/access-logs', requireAuth, requireRole('SUPER_ADMIN'), PlatformAdminController.listAccessLogs);
routes.post('/admin/push/broadcast', requireAuth, requireRole('SUPER_ADMIN'), PlatformAdminController.broadcastPush);
routes.get('/admin/condominiums/manage', requireAuth, requireRole('SUPER_ADMIN'), CondominiumController.adminOverview);
routes.post('/admin/condominiums', requireAuth, requireRole('SUPER_ADMIN'), CondominiumController.adminCreate);
routes.patch('/admin/condominiums/:condominiumId', requireAuth, requireRole('SUPER_ADMIN'), CondominiumController.adminUpdate);
routes.patch('/admin/condominiums/:condominiumId/deactivate', requireAuth, requireRole('SUPER_ADMIN'), CondominiumController.adminDeactivate);
routes.post('/admin/condominiums/:condominiumId/events', requireAuth, requireRole('SUPER_ADMIN'), CondominiumController.adminCreateEvent);
routes.patch('/admin/condominium-events/:eventId', requireAuth, requireRole('SUPER_ADMIN'), CondominiumController.adminUpdateEvent);
routes.patch('/admin/condominium-events/:eventId/deactivate', requireAuth, requireRole('SUPER_ADMIN'), CondominiumController.adminDeactivateEvent);
routes.post('/admin/condominiums/:condominiumId/stores', requireAuth, requireRole('SUPER_ADMIN'), CondominiumController.adminApproveStore);
routes.patch('/admin/condominiums/:condominiumId/stores/:storeId/settings', requireAuth, requireRole('SUPER_ADMIN'), CondominiumController.adminUpdateStoreSettings);
routes.post('/admin/condominium-events/:eventId/stores', requireAuth, requireRole('SUPER_ADMIN'), CondominiumController.adminAddStoreToEvent);
routes.patch('/admin/condominium-requests/:requestId/review', requireAuth, requireRole('SUPER_ADMIN'), CondominiumController.adminReviewRequest);
 routes.post('/admin/payments/:paymentId/reprocess', requireAuth, requireRole('SUPER_ADMIN'), PaymentController.reprocess);
 routes.patch('/admin/stores/:storeId/suspend', requireAuth, requireRole('SUPER_ADMIN'), PlatformAdminController.suspendStore);
 routes.patch('/admin/stores/:storeId/reactivate', requireAuth, requireRole('SUPER_ADMIN'), PlatformAdminController.reactivateStore);
 routes.patch('/admin/stores/:storeId/plan-exempt', requireAuth, requireRole('SUPER_ADMIN'), PlatformAdminController.updatePlanExempt);

// Platform KYC (motoboy documents) - SUPER_ADMIN only
routes.get('/admin/motoboys/kyc/audit', requireAuth, requireRole('SUPER_ADMIN'), MotoboyKycController.auditSummary);
routes.get('/admin/motoboys/kyc/pending', requireAuth, requireRole('SUPER_ADMIN'), MotoboyKycController.listPending);
routes.get('/admin/motoboys/kyc/reviews', requireAuth, requireRole('SUPER_ADMIN'), MotoboyKycController.listRecentReviews);
routes.get('/admin/motoboys/:motoboyId/documents', requireAuth, requireRole('SUPER_ADMIN'), MotoboyKycController.listMotoboyDocuments);
routes.post(
  '/admin/motoboys/:motoboyId/documents/:documentId/approve',
  requireAuth,
  requireRole('SUPER_ADMIN'),
  MotoboyKycController.approveDocument
);
routes.post(
  '/admin/motoboys/:motoboyId/documents/:documentId/reject',
  requireAuth,
  requireRole('SUPER_ADMIN'),
  MotoboyKycController.rejectDocument
);

// Store public
routes.get('/public/platform/metrics', PlatformPublicController.metrics);
routes.get('/public/stores', StoreController.listPortfolio);
routes.get('/public/condominiums', CondominiumController.listPublic);
routes.get('/public/condominiums/:slug', CondominiumController.getPublicBySlug);
routes.get('/public/condominiums/:slug/stores', CondominiumController.listPublicStoresBySlug);
routes.get('/public/featured-products', FeaturedProductController.listPublic);
routes.post('/public/stores/slug/:slug/track', StoreController.trackLink);
routes.get('/stores/slug/:slug', StoreController.getBySlug);
routes.get('/chamanoespeto/:slug', StoreController.getBySlug);
routes.get('/janocaminho/:slug', StoreController.getBySlug);
routes.get('/stores/slug/:slug/products', ProductController.listPublicBySlug);
routes.get('/public/stores/slug/:slug/products', ProductController.listPublicBySlug);
routes.post('/public/stores/slug/:slug/postal/quote', ShippingController.quotePostalPublicBySlug);
routes.get('/stores/slug/:slug/categories', ProductController.listPublicCategoriesBySlug);
routes.get('/public/stores/slug/:slug/categories', ProductController.listPublicCategoriesBySlug);
routes.post('/stores/slug/:slug/postal/quote', ShippingController.quotePostalPublicBySlug);
routes.get('/public/stores/slug/:slug/highlights', OrderController.listHighlightsBySlug);
routes.get('/public/stores/slug/:slug/tables/status', OrderController.listTableStatusBySlug);

// Store admin
routes.put('/stores/:storeId', requireAuth, requireRole('ADMIN'), StoreController.update);
routes.put('/stores/:storeId/status', requireAuth, requireRole('ADMIN'), StoreController.updateStatus);
routes.get('/stores/:storeId/link-stats', requireAuth, requireRole('ADMIN'), StoreController.getLinkStats);
routes.get('/stores/:storeId/users', requireAuth, requireRole('ADMIN'), StoreUserController.list);
routes.post('/stores/:storeId/users', requireAuth, requireRole('ADMIN'), StoreUserController.create);
routes.patch('/stores/:storeId/users/:userId/password', requireAuth, requireRole('ADMIN'), StoreUserController.updatePassword);
routes.delete('/stores/:storeId/users/:userId', requireAuth, requireRole('ADMIN'), StoreUserController.remove);
routes.get('/stores/:storeId/featured-requests', requireAuth, requireRole('ADMIN', 'OPERATOR', 'CHURRASQUEIRO'), FeaturedProductController.listByStore);
routes.get('/stores/:storeId/featured-pricing', requireAuth, requireRole('ADMIN', 'OPERATOR', 'CHURRASQUEIRO'), FeaturedProductController.getStorePricing);
routes.post('/stores/:storeId/featured-requests', requireAuth, requireRole('ADMIN', 'OPERATOR', 'CHURRASQUEIRO'), FeaturedProductController.createStoreRequest);
routes.patch('/stores/:storeId/featured-requests/:requestId/cancel', requireAuth, requireRole('ADMIN', 'OPERATOR', 'CHURRASQUEIRO'), FeaturedProductController.cancelByStore);
routes.patch('/stores/:storeId/featured-requests/:requestId/refresh-payment', requireAuth, requireRole('ADMIN', 'OPERATOR', 'CHURRASQUEIRO'), FeaturedProductController.refreshPaymentByStore);
routes.get('/stores/:storeId/condominiums', requireAuth, requireRole('ADMIN'), CondominiumController.listStoreOptions);
routes.post('/stores/:storeId/condominium-requests', requireAuth, requireRole('ADMIN'), CondominiumController.createStoreRequest);
routes.delete('/stores/:storeId/condominiums/:condominiumId', requireAuth, requireRole('ADMIN'), CondominiumController.removeStoreCondominium);

// Products admin (cadastro não depende de assinatura)
routes.post('/stores/:storeId/products', requireAuth, requireRole('ADMIN'), ProductController.create);
routes.get('/stores/:storeId/products', requireAuth, requireRole('ADMIN', 'OPERATOR', 'CHURRASQUEIRO'), ProductController.list);
routes.put('/stores/:storeId/products/:productId', requireAuth, requireRole('ADMIN'), ProductController.update);
routes.delete('/stores/:storeId/products/:productId', requireAuth, requireRole('ADMIN'), ProductController.remove);
routes.get('/stores/:storeId/categories', requireAuth, requireRole('ADMIN', 'OPERATOR', 'CHURRASQUEIRO'), ProductController.listCategories);
routes.patch('/stores/:storeId/categories/priority', requireAuth, requireRole('ADMIN'), ProductController.setCategoryPriority);
routes.get('/stores/:storeId/inventory', requireAuth, requireRole('ADMIN', 'OPERATOR', 'CHURRASQUEIRO'), ProductController.listInventory);
routes.get('/stores/:storeId/inventory/alerts', requireAuth, requireRole('ADMIN', 'OPERATOR', 'CHURRASQUEIRO'), ProductController.getInventoryAlerts);
routes.get('/stores/:storeId/inventory/movements', requireAuth, requireRole('ADMIN', 'OPERATOR', 'CHURRASQUEIRO'), ProductController.listInventoryMovements);
routes.patch('/stores/:storeId/products/:productId/stock', requireAuth, requireRole('ADMIN', 'OPERATOR', 'CHURRASQUEIRO'), ProductController.adjustStock);
routes.post('/stores/:storeId/postal/quote', requireAuth, requireRole('ADMIN', 'OPERATOR', 'CHURRASQUEIRO'), ShippingController.quotePostalByStore);

// Orders - cliente cria (aqui sim assinatura com carência)
routes.post('/stores/:storeId/orders', hydrateAuthOptional, requireActiveSubscription, OrderController.create);
routes.post('/stores/slug/:slug/orders', hydrateAuthOptional, requireActiveSubscription, OrderController.createBySlug);

// Orders - staff vê fila/histórico (churrasqueiro + admin)
routes.get('/stores/:storeId/orders', requireAuth, requireRole('ADMIN', 'OPERATOR', 'CHURRASQUEIRO'), OrderController.list);
routes.get('/stores/slug/:slug/orders', requireAuth, requireRole('ADMIN', 'OPERATOR', 'CHURRASQUEIRO'), OrderController.listBySlug);
routes.patch('/orders/:orderId/status', requireAuth, requireRole('ADMIN', 'OPERATOR', 'CHURRASQUEIRO'), OrderController.updateStatus);
routes.patch('/orders/:orderId/fulfillment-mode', requireAuth, requireRole('ADMIN', 'OPERATOR', 'CHURRASQUEIRO'), OrderController.updateFulfillmentMode);
routes.patch('/orders/:orderId/postal', requireAuth, requireRole('ADMIN', 'OPERATOR', 'CHURRASQUEIRO'), OrderController.updatePostalShipment);
routes.patch('/orders/:orderId', requireAuth, requireRole('ADMIN', 'OPERATOR', 'CHURRASQUEIRO'), OrderController.updateItems);
routes.patch('/orders/:orderId/reopen', requireAuth, requireRole('ADMIN', 'OPERATOR', 'CHURRASQUEIRO'), OrderController.reopen);
routes.patch('/orders/:orderId/mark-as-printed', requireAuth, requireRole('ADMIN', 'OPERATOR', 'CHURRASQUEIRO'), OrderController.markItemsAsPrinted);
routes.get('/orders/:orderId/public', OrderController.getPublic);
routes.get('/v2/orders/:orderId/tracking', OrderController.getTrackingV2);
routes.get('/orders/:orderId/review', OrderReviewController.getByOrder);
routes.post('/orders/:orderId/review', OrderReviewController.submitByOrder);
routes.get('/stores/:storeId/reviews', requireAuth, requireRole('ADMIN', 'CHURRASQUEIRO'), OrderReviewController.listByStore);
routes.get('/stores/:storeId/reviews/summary', requireAuth, requireRole('ADMIN', 'CHURRASQUEIRO'), OrderReviewController.summaryByStore);
routes.get('/stores/:storeId/reviews/tip-payouts', requireAuth, requireRole('ADMIN', 'CHURRASQUEIRO'), requirePlanFeature('tipPayouts'), OrderReviewController.listTipPayoutsByStore);
routes.patch('/stores/:storeId/reviews/:reviewId/tip-payout', requireAuth, requireRole('ADMIN', 'CHURRASQUEIRO'), requirePlanFeature('tipPayouts'), OrderReviewController.markTipPayoutByStore);

// Motoboy
routes.get('/motoboy/orders/available', requireAuth, MotoboyController.listAvailableOrders);
routes.post('/motoboy/push/register', requireAuth, MotoboyController.registerPushToken);
routes.post('/motoboy/push/unregister', requireAuth, MotoboyController.unregisterPushToken);
routes.get('/motoboy/orders/current', requireAuth, MotoboyController.getCurrentOrder);
routes.get('/motoboy/orders/history', requireAuth, MotoboyController.listHistory);
routes.get('/motoboy/earnings/today', requireAuth, MotoboyController.getEarningsToday);
routes.get('/motoboy/stats', requireAuth, MotoboyController.getStats);
routes.get('/motoboy/reviews/tip-payouts', requireAuth, OrderReviewController.listTipPayoutsForMotoboy);
routes.post('/motoboy/orders/:orderId/accept', requireAuth, MotoboyController.acceptOrder);
routes.post('/motoboy/orders/:orderId/pickup', requireAuth, MotoboyController.pickupOrder);
routes.post('/motoboy/orders/:orderId/start', requireAuth, MotoboyController.startDelivery);
routes.post('/motoboy/orders/:orderId/confirm-payment', requireAuth, MotoboyController.confirmPayment);
routes.post('/motoboy/orders/:orderId/delivered', requireAuth, MotoboyController.markDelivered);
routes.post('/motoboy/orders/:orderId/finish', requireAuth, MotoboyController.finishOrder);

// Compatibility alias (business wording).
routes.get('/couriers/me/active-delivery', requireAuth, MotoboyController.getCurrentOrder);
routes.get('/couriers/me/stats', requireAuth, MotoboyController.getStats);

// Store operations
routes.post('/deliveries/:deliveryId/cancel', requireAuth, requireRole('ADMIN'), DeliveryController.cancel);
routes.post('/motoboy/documents', requireAuth, MotoboyController.uploadDocument);
routes.get('/motoboy/documents', requireAuth, MotoboyController.listOwnDocuments);
routes.get('/motoboy/profile', requireAuth, MotoboyController.getProfile);
routes.put('/motoboy/profile', requireAuth, MotoboyController.updateProfile);
routes.get('/motoboy/store-requests', requireAuth, MotoboyController.listStoreRequests);
routes.post('/motoboy/store-requests', requireAuth, MotoboyController.createStoreRequest);
routes.post('/motoboy/stores/:storeId/leave', requireAuth, MotoboyController.leaveStore);

// Legal content (public)
routes.get('/legal/terms', LegalController.getTerms);
routes.get('/legal/lgpd', LegalController.getLgpd);
routes.post('/admin/site-settings', requireAuth, requireRole('SUPER_ADMIN'), LegalController.setSetting);
routes.get('/admin/featured-requests', requireAuth, requireRole('SUPER_ADMIN'), FeaturedProductController.listForAdmin);
routes.patch('/admin/featured-requests/:requestId/review', requireAuth, requireRole('SUPER_ADMIN'), FeaturedProductController.reviewByAdmin);

// Store owner motoboy management
routes.get('/stores/:storeId/motoboys', requireAuth, requireRole('ADMIN'), requirePlanFeature('motoboyManagement'), MotoboyController.listByStore);
routes.post('/stores/:storeId/motoboys', requireAuth, requireRole('ADMIN'), requirePlanFeature('motoboyManagement'), MotoboyController.createForStore);
routes.post('/stores/:storeId/motoboys/:motoboyId/link', requireAuth, requireRole('ADMIN'), requirePlanFeature('motoboyManagement'), MotoboyController.linkStore);
routes.post('/stores/:storeId/motoboys/:motoboyId/unlink', requireAuth, requireRole('ADMIN'), requirePlanFeature('motoboyManagement'), MotoboyController.unlinkStore);
routes.post('/stores/:storeId/motoboys/:motoboyId/approve', requireAuth, requireRole('ADMIN'), requirePlanFeature('motoboyManagement'), MotoboyController.approve);
routes.post('/stores/:storeId/motoboys/:motoboyId/suspend', requireAuth, requireRole('ADMIN'), requirePlanFeature('motoboyManagement'), MotoboyController.suspend);
routes.get('/stores/:storeId/motoboy-requests', requireAuth, requireRole('ADMIN'), requirePlanFeature('motoboyManagement'), MotoboyController.listStoreRequestsForStore);
routes.post(
  '/stores/:storeId/motoboy-requests/:requestId/approve',
  requireAuth,
  requireRole('ADMIN'),
  requirePlanFeature('motoboyManagement'),
  MotoboyController.approveStoreRequest
);
routes.post(
  '/stores/:storeId/motoboy-requests/:requestId/reject',
  requireAuth,
  requireRole('ADMIN'),
  requirePlanFeature('motoboyManagement'),
  MotoboyController.rejectStoreRequest
);

// Delivery billing (motoboy fees)
routes.get('/stores/:storeId/delivery-billing', requireAuth, requireRole('ADMIN'), DeliveryBillingController.getCurrent);
routes.post('/stores/:storeId/delivery-billing/pay', requireAuth, requireRole('ADMIN'), DeliveryBillingController.pay);
 routes.get(
   '/stores/:storeId/motoboys/:motoboyId/documents',
   requireAuth,
   requireRole('ADMIN'),
   requirePlanFeature('motoboyManagement'),
   MotoboyController.listDocuments
 );
 routes.post(
  '/stores/:storeId/motoboys/:motoboyId/documents/:documentId/reupload',
  requireAuth,
  requireRole('ADMIN'),
  requirePlanFeature('motoboyManagement'),
  MotoboyController.requestDocumentReupload
 );

export default routes;
