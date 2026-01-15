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
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { StoreController } from '../controllers/StoreController';
import { ProductController } from '../controllers/ProductController';
import { OrderController } from '../controllers/OrderController';
import { PlanController } from '../controllers/PlanController';
import { SubscriptionController } from '../controllers/SubscriptionController';
import { PlatformAdminController } from '../controllers/PlatformAdminController';
import { PaymentController } from '../controllers/PaymentController';

import { requireAuth, requireRole } from '../middleware/authGuard';
import { requireActiveSubscription } from '../middleware/subscriptionGuard';

const routes = Router();

// Auth
routes.post('/auth/register', AuthController.register);
routes.post('/auth/login', AuthController.login);
routes.post('/auth/admin-login', AuthController.adminLogin);
routes.post('/auth/super-login', AuthController.superAdminLogin);
routes.post('/auth/forgot-password', AuthController.forgotPassword);
routes.post('/auth/reset-password', AuthController.resetPassword);
routes.post('/auth/verify-email', AuthController.verifyEmail);
routes.post('/auth/resend-verification', AuthController.resendVerification);

// Plans / payments
routes.get('/plans', PlanController.list);
routes.post('/subscriptions', SubscriptionController.create);
routes.get('/stores/:storeId/subscription', SubscriptionController.getByStore);
routes.post('/stores/:storeId/subscription/renew', requireAuth, requireRole('ADMIN'), SubscriptionController.createRenewalPayment);
routes.post('/subscriptions/:id/renew', SubscriptionController.renew);
routes.patch('/subscriptions/:id/status', SubscriptionController.updateStatus);
routes.post('/webhooks/payment-confirmed', PaymentController.confirm);
routes.post('/webhooks/mercadopago', PaymentController.mercadoPagoWebhook);
routes.get('/payments/:paymentId', PaymentController.getById);
routes.get('/payments/:paymentId/events', PaymentController.getEvents);

// Platform admin (se for painel de plataforma mesmo, proteja)
routes.get('/admin/overview', requireAuth, requireRole('SUPER_ADMIN'), PlatformAdminController.overview);
routes.get('/admin/stores', requireAuth, requireRole('SUPER_ADMIN'), PlatformAdminController.listStores);
routes.get('/admin/payment-events', requireAuth, requireRole('SUPER_ADMIN'), PlatformAdminController.listPaymentEvents);
routes.get('/admin/access-logs', requireAuth, requireRole('SUPER_ADMIN'), PlatformAdminController.listAccessLogs);
routes.post('/admin/payments/:paymentId/reprocess', requireAuth, requireRole('SUPER_ADMIN'), PaymentController.reprocess);
routes.patch('/admin/stores/:storeId/suspend', requireAuth, requireRole('SUPER_ADMIN'), PlatformAdminController.suspendStore);
routes.patch('/admin/stores/:storeId/reactivate', requireAuth, requireRole('SUPER_ADMIN'), PlatformAdminController.reactivateStore);

// Store public
routes.get('/public/stores', StoreController.listPortfolio);
routes.get('/stores/slug/:slug', StoreController.getBySlug);
routes.get('/chamanoespeto/:slug', StoreController.getBySlug);
routes.get('/stores/slug/:slug/products', ProductController.listPublicBySlug);
routes.get('/public/stores/slug/:slug/products', ProductController.listPublicBySlug);

// Store admin
routes.put('/stores/:storeId', requireAuth, requireRole('ADMIN'), StoreController.update);
routes.put('/stores/:storeId/status', requireAuth, requireRole('ADMIN'), StoreController.updateStatus);

// Products admin (cadastro não depende de assinatura)
routes.post('/stores/:storeId/products', requireAuth, requireRole('ADMIN'), ProductController.create);
routes.get('/stores/:storeId/products', requireAuth, requireRole('ADMIN'), ProductController.list);
routes.put('/stores/:storeId/products/:productId', requireAuth, requireRole('ADMIN'), ProductController.update);
routes.delete('/stores/:storeId/products/:productId', requireAuth, requireRole('ADMIN'), ProductController.remove);

// Orders - cliente cria (aqui sim assinatura com carência)
routes.post('/stores/:storeId/orders', requireActiveSubscription, OrderController.create);
routes.post('/stores/slug/:slug/orders', requireActiveSubscription, OrderController.createBySlug);

// Orders - staff vê fila/histórico (churrasqueiro + admin)
routes.get('/stores/:storeId/orders', requireAuth, requireRole('ADMIN', 'CHURRASQUEIRO'), OrderController.list);
routes.get('/stores/slug/:slug/orders', requireAuth, requireRole('ADMIN', 'CHURRASQUEIRO'), OrderController.listBySlug);
routes.patch('/orders/:orderId/status', requireAuth, requireRole('ADMIN', 'CHURRASQUEIRO'), OrderController.updateStatus);
routes.patch('/orders/:orderId', requireAuth, requireRole('ADMIN', 'CHURRASQUEIRO'), OrderController.updateItems);
routes.get('/orders/:orderId/public', OrderController.getPublic);

export default routes;
