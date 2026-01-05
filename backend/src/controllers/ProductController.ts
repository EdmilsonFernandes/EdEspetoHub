import { Request, Response } from 'express';
import { ProductService } from '../services/ProductService';

const productService = new ProductService();

export class ProductController {
  static async create(req: Request, res: Response) {
    try {
      const product = await productService.create(
        { ...req.body, storeId: req.params.storeId },
        req.auth?.storeId
      );
      return res.status(201).json(product);
    } catch (error: any) {
      const status = error.message.includes('perm') ? 403 : 400;
      return res.status(status).json({ message: error.message });
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const products = await productService.listByStoreId(req.params.storeId, req.auth?.storeId);
      return res.json(products);
    } catch (error: any) {
      const status = error.message.includes('perm') ? 403 : 400;
      return res.status(status).json({ message: error.message });
    }
  }

  static async listBySlug(req: Request, res: Response) {
    try {
      const products = await productService.listByStoreSlug(req.params.slug, req.auth?.storeId);
      return res.json(products);
    } catch (error: any) {
      const status = error.message.includes('perm') ? 403 : 400;
      return res.status(status).json({ message: error.message });
    }
  }

  static async listPublicBySlug(req: Request, res: Response) {
    try {
      const products = await productService.listByStoreSlug(req.params.slug);
      return res.json(products);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const product = await productService.update(
        req.params.storeId,
        req.params.productId,
        req.body,
        req.auth?.storeId
      );
      return res.json(product);
    } catch (error: any) {
      const status = error.message.includes('perm') ? 403 : 400;
      return res.status(status).json({ message: error.message });
    }
  }

  static async remove(req: Request, res: Response) {
    try {
      await productService.remove(req.params.storeId, req.params.productId, req.auth?.storeId);
      return res.status(204).send();
    } catch (error: any) {
      const status = error.message.includes('perm') ? 403 : 400;
      return res.status(status).json({ message: error.message });
    }
  }
}
