import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { StoreController } from '../controllers/StoreController';
import { ProductController } from '../controllers/ProductController';
import { OrderController } from '../controllers/OrderController';
import { PlanController } from '../controllers/PlanController';
import { SubscriptionController } from '../controllers/SubscriptionController';
import { PlatformAdminController } from '../controllers/PlatformAdminController';
import { requireActiveSubscription } from '../middleware/subscriptionGuard';

const routes = Router();

routes.post('/auth/register', AuthController.register);
routes.post('/auth/login', AuthController.login);

routes.get('/plans', PlanController.list);

routes.post('/subscriptions', SubscriptionController.create);
routes.get('/stores/:storeId/subscription', SubscriptionController.getByStore);
routes.post('/subscriptions/:id/renew', SubscriptionController.renew);
routes.patch('/subscriptions/:id/status', SubscriptionController.updateStatus);

routes.get('/admin/stores', PlatformAdminController.listStores);
routes.patch('/admin/stores/:storeId/suspend', PlatformAdminController.suspendStore);
routes.patch('/admin/stores/:storeId/reactivate', PlatformAdminController.reactivateStore);

routes.get('/stores/:slug', StoreController.getBySlug);
routes.get('/chamanoespeto/:slug', StoreController.getBySlug);
routes.put('/stores/:id', StoreController.update);
routes.put('/stores/:id/status', StoreController.updateStatus);

routes.post('/stores/:storeId/products', ProductController.create);
routes.get('/stores/:storeId/products', ProductController.list);
routes.put('/stores/:storeId/products/:productId', ProductController.update);
routes.delete('/stores/:storeId/products/:productId', ProductController.remove);

routes.post('/stores/:storeId/orders', requireActiveSubscription, OrderController.create);
routes.get('/stores/:storeId/orders', requireActiveSubscription, OrderController.list);

export default routes;
