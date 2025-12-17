import { Request, Response } from 'express';
import { ProductService } from '../services/ProductService';

const productService = new ProductService();

export class ProductController {
  static async create(req: Request, res: Response) {
    try {
      const product = await productService.create({ ...req.body, storeId: req.params.storeId });
      return res.status(201).json(product);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const products = await productService.listByStore(req.params.storeId);
      return res.json(products);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }
}
