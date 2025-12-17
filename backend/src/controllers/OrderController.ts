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
      const orders = await orderService.listByStore(req.params.storeId);
      return res.json(orders);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }
}
