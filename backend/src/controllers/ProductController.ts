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

  static async update(req: Request, res: Response) {
    try {
      const product = await productService.update(req.params.storeId, req.params.productId, req.body);
      return res.json(product);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  static async remove(req: Request, res: Response) {
    try {
      await productService.remove(req.params.storeId, req.params.productId);
      return res.status(204).send();
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }
}
