import { Router } from 'express';
import { OrdersController } from './orders.controller';
import { OrderLib } from '../../libs/order.lib';
import { CommandProducer } from '../../bus/command-producer';
import { authRequired, authOptional } from '../../middleware/auth.middleware';
export function createOrderRoutes(producer: CommandProducer): Router {
    const ctrl = new OrdersController(new OrderLib(producer));
    const r = Router();
    r.get('/:orderId/public', ctrl.getPublic.bind(ctrl));
    r.get('/:orderId/tracking', ctrl.getTrackingV2.bind(ctrl));
    r.get('/highlights/:slug', ctrl.listHighlightsBySlug.bind(ctrl));
    r.post('/store/:storeId', authOptional, ctrl.create.bind(ctrl));
    r.post('/slug/:slug', authOptional, ctrl.createBySlug.bind(ctrl));
    r.get('/store/:storeId/queue', authRequired, ctrl.listQueue.bind(ctrl));
    r.get('/store/:storeId', authRequired, ctrl.list.bind(ctrl));
    r.patch('/:orderId/status', authRequired, ctrl.updateStatus.bind(ctrl));
    r.patch('/:orderId/items', authRequired, ctrl.updateItems.bind(ctrl));
    return r;
}
