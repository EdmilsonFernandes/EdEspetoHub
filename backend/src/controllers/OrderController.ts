import { Request, Response } from 'express';
import { OrderService } from '../services/OrderService';

const orderService = new OrderService();

export class OrderController {
  static async create(req: Request, res: Response) {
    try {
      const order = await orderService.create({ ...req.body, storeId: req.params.storeId });
      return res.status(201).json(order);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const orders = await orderService.listByStoreId(req.params.storeId, req.auth?.storeId);
      return res.json(orders);
    } catch (error: any) {
      const status = error.message.includes('perm') ? 403 : 400;
      return res.status(status).json({ message: error.message });
    }
  }

  static async createBySlug(req: Request, res: Response) {
    try {
      const order = await orderService.createBySlug({ ...req.body, storeSlug: req.params.slug });
      return res.status(201).json(order);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  static async listBySlug(req: Request, res: Response) {
    try {
      const orders = await orderService.listByStoreSlug(req.params.slug, req.auth?.storeId);
      return res.json(orders);
    } catch (error: any) {
      const status = error.message.includes('perm') ? 403 : 400;
      return res.status(status).json({ message: error.message });
    }
  }

  static async updateStatus(req: Request, res: Response) {
    const { status } = req.body;
    try {
      const order = await orderService.updateStatus(req.params.orderId, status, req.auth?.storeId);
      return res.json(order);
    } catch (error: any) {
      const statusCode = error.message.includes('perm') ? 403 : 400;
      return res.status(statusCode).json({ message: error.message });
    }
  }

  static async updateItems(req: Request, res: Response) {
    try {
      const order = await orderService.updateItems(req.params.orderId, req.body.items || [], req.auth?.storeId);
      return res.json({ id: order.id, total: order.total });
    } catch (error: any) {
      const statusCode = error.message.includes('perm') ? 403 : 400;
      return res.status(statusCode).json({ message: error.message });
    }
  }
}
