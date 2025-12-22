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

// Plans / payments
routes.get('/plans', PlanController.list);
routes.post('/subscriptions', SubscriptionController.create);
routes.get('/stores/:storeId/subscription', SubscriptionController.getByStore);
routes.post('/subscriptions/:id/renew', SubscriptionController.renew);
routes.patch('/subscriptions/:id/status', SubscriptionController.updateStatus);
routes.post('/webhooks/payment-confirmed', PaymentController.confirm);
routes.get('/payments/:paymentId', PaymentController.getById);

// Platform admin (se for painel de plataforma mesmo, proteja)
routes.get('/admin/stores', requireAuth, requireRole('ADMIN'), PlatformAdminController.listStores);
routes.patch('/admin/stores/:storeId/suspend', requireAuth, requireRole('ADMIN'), PlatformAdminController.suspendStore);
routes.patch('/admin/stores/:storeId/reactivate', requireAuth, requireRole('ADMIN'), PlatformAdminController.reactivateStore);

// Store public
routes.get('/stores/slug/:slug', StoreController.getBySlug);
routes.get('/chamanoespeto/:slug', StoreController.getBySlug);

// Store admin
routes.put('/stores/:storeId', requireAuth, requireRole('ADMIN'), StoreController.update);
routes.put('/stores/:storeId/status', requireAuth, requireRole('ADMIN'), StoreController.updateStatus);

// Products admin (cadastro não depende de assinatura)
routes.post('/stores/:storeId/products', requireAuth, requireRole('ADMIN'), ProductController.create);
routes.get('/stores/:storeId/products', requireAuth, requireRole('ADMIN'), ProductController.list);
routes.get('/stores/slug/:slug/products', requireAuth, requireRole('ADMIN'), ProductController.listBySlug);
routes.put('/stores/:storeId/products/:productId', requireAuth, requireRole('ADMIN'), ProductController.update);
routes.delete('/stores/:storeId/products/:productId', requireAuth, requireRole('ADMIN'), ProductController.remove);

// Orders - cliente cria (aqui sim assinatura com carência)
routes.post('/stores/:storeId/orders', requireActiveSubscription, OrderController.create);
routes.post('/stores/slug/:slug/orders', requireActiveSubscription, OrderController.createBySlug);

// Orders - staff vê fila/histórico (churrasqueiro + admin)
routes.get('/stores/:storeId/orders', requireAuth, requireRole('ADMIN', 'CHURRASQUEIRO'), OrderController.list);
routes.get('/stores/slug/:slug/orders', requireAuth, requireRole('ADMIN', 'CHURRASQUEIRO'), OrderController.listBySlug);

export default routes;
