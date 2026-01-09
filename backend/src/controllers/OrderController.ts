import { Request, Response } from 'express';
import { OrderService } from '../services/OrderService';
import { logger } from '../utils/logger';

const orderService = new OrderService();
const log = logger.child({ scope: 'OrderController' });

export class OrderController {
  static async create(req: Request, res: Response) {
    try {
      log.info('Order create request', { storeId: req.params.storeId });
      const order = await orderService.create({ ...req.body, storeId: req.params.storeId });
      log.info('Order created', { orderId: order?.id, storeId: req.params.storeId });
      return res.status(201).json(order);
    } catch (error: any) {
      log.warn('Order create failed', { storeId: req.params.storeId, error });
      return res.status(400).json({ message: error.message });
    }
  }

  static async list(req: Request, res: Response) {
    try {
      log.debug('Order list request', { storeId: req.params.storeId });
      const orders = await orderService.listByStoreId(req.params.storeId, req.auth?.storeId);
      return res.json(orders);
    } catch (error: any) {
      log.warn('Order list failed', { storeId: req.params.storeId, error });
      const status = error.message.includes('perm') ? 403 : 400;
      return res.status(status).json({ message: error.message });
    }
  }

  static async createBySlug(req: Request, res: Response) {
    try {
      log.info('Order create by slug request', { slug: req.params.slug });
      const order = await orderService.createBySlug({ ...req.body, storeSlug: req.params.slug });
      log.info('Order created by slug', { orderId: order?.id, slug: req.params.slug });
      return res.status(201).json(order);
    } catch (error: any) {
      log.warn('Order create by slug failed', { slug: req.params.slug, error });
      return res.status(400).json({ message: error.message });
    }
  }

  static async listBySlug(req: Request, res: Response) {
    try {
      log.debug('Order list by slug request', { slug: req.params.slug });
      const orders = await orderService.listByStoreSlug(req.params.slug, req.auth?.storeId);
      return res.json(orders);
    } catch (error: any) {
      log.warn('Order list by slug failed', { slug: req.params.slug, error });
      const status = error.message.includes('perm') ? 403 : 400;
      return res.status(status).json({ message: error.message });
    }
  }

  static async updateStatus(req: Request, res: Response) {
    const { status } = req.body;
    try {
      log.info('Order status update request', { orderId: req.params.orderId, status });
      const order = await orderService.updateStatus(req.params.orderId, status, req.auth?.storeId);
      log.info('Order status updated', { orderId: req.params.orderId, status });
      return res.json(order);
    } catch (error: any) {
      log.warn('Order status update failed', { orderId: req.params.orderId, error });
      const statusCode = error.message.includes('perm') ? 403 : 400;
      return res.status(statusCode).json({ message: error.message });
    }
  }

  static async updateItems(req: Request, res: Response) {
    try {
      log.info('Order items update request', { orderId: req.params.orderId });
      const order = await orderService.updateItems(req.params.orderId, req.body.items || [], req.auth?.storeId);
      log.info('Order items updated', { orderId: req.params.orderId, total: order?.total });
      return res.json({ id: order.id, total: order.total });
    } catch (error: any) {
      log.warn('Order items update failed', { orderId: req.params.orderId, error });
      const statusCode = error.message.includes('perm') ? 403 : 400;
      return res.status(statusCode).json({ message: error.message });
    }
  }

  static async getPublic(req: Request, res: Response) {
    const { orderId } = req.params;
    try {
      log.debug('Order public get request', { orderId });
      const result = await orderService.getPublicById(orderId);
      if (!result) return res.status(404).json({ message: 'Pedido não encontrado' });
      const { order, queuePosition, queueSize } = result;

      return res.json({
        id: order.id,
        status: order.status,
        type: order.type,
        table: order.table,
        customerName: order.customerName,
        phone: order.phone,
        address: order.address,
        total: order.total,
        createdAt: order.createdAt,
        queuePosition,
        queueSize,
        items: (order.items || []).map((item) => ({
          id: item.id,
          name: item.product?.name || item.name,
          quantity: item.quantity,
          price: item.price,
          productId: item.product?.id,
        })),
        store: order.store
          ? {
              id: order.store.id,
              name: order.store.name,
              slug: order.store.slug,
              phone: order.store.owner?.phone || null,
            }
          : null,
      });
    } catch (error: any) {
      log.warn('Order public get failed', { orderId, error });
      return res.status(400).json({ message: error.message });
    }
  }
}
