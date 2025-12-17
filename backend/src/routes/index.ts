import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { StoreController } from '../controllers/StoreController';
import { ProductController } from '../controllers/ProductController';
import { OrderController } from '../controllers/OrderController';

const routes = Router();

routes.post('/auth/register', AuthController.register);
routes.post('/auth/login', AuthController.login);

routes.get('/stores/:slug', StoreController.getBySlug);
routes.put('/stores/:id', StoreController.update);
routes.put('/stores/:id/status', StoreController.updateStatus);

routes.post('/stores/:storeId/products', ProductController.create);
routes.get('/stores/:storeId/products', ProductController.list);

routes.post('/stores/:storeId/orders', OrderController.create);
routes.get('/stores/:storeId/orders', OrderController.list);

export default routes;
