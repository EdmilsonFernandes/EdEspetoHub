import { Request, Response } from 'express';
import { ProductService } from '../services/ProductService';
import { logger } from '../utils/logger';
import { respondWithError } from '../errors/respondWithError';

const productService = new ProductService();
const log = logger.child({ scope: 'ProductController' });
const DEMO_SLUGS = new Set([ 'demo', 'test-store' ]);
const demoProducts = [
  {
    id: 'demo-1',
    name: 'Espetinho de Alcatra',
    price: 12.9,
    category: 'Classicos',
    imageUrl: '/chama-no-espeto.jpeg',
  },
  {
    id: 'demo-2',
    name: 'Espetinho de Frango',
    price: 9.9,
    category: 'Classicos',
    imageUrl: '/chama-no-espeto.jpeg',
  },
  {
    id: 'demo-3',
    name: 'Linguiça Artesanal',
    price: 10.9,
    category: 'Grelhados',
    imageUrl: '/chama-no-espeto.jpeg',
  },
  {
    id: 'demo-4',
    name: 'Pão de Alho Especial',
    price: 7.5,
    category: 'Acompanhamentos',
    imageUrl: '/chama-no-espeto.jpeg',
  },
  {
    id: 'demo-5',
    name: 'Refrigerante Lata',
    price: 6.0,
    category: 'Bebidas',
    imageUrl: '/chama-no-espeto.jpeg',
  },
];

export class ProductController {
  static async create(req: Request, res: Response) {
    try {
      log.info('Product create request', { storeId: req.params.storeId });
      const product = await productService.create(
        { ...req.body, storeId: req.params.storeId },
        req.auth?.storeId
      );
      log.info('Product created', { productId: product?.id, storeId: req.params.storeId });
      return res.status(201).json(product);
    } catch (error: any) {
      log.warn('Product create failed', { storeId: req.params.storeId, error });
      return respondWithError(req, res, error, 400);
    }
  }

  static async list(req: Request, res: Response) {
    try {
      log.debug('Product list request', { storeId: req.params.storeId });
      const products = await productService.listByStoreId(req.params.storeId, req.auth?.storeId);
      return res.json(products);
    } catch (error: any) {
      log.warn('Product list failed', { storeId: req.params.storeId, error });
      return respondWithError(req, res, error, 400);
    }
  }

  static async listBySlug(req: Request, res: Response) {
    try {
      if (DEMO_SLUGS.has(req.params.slug)) {
        return res.json(demoProducts);
      }
      log.debug('Product list by slug request', { slug: req.params.slug });
      const products = await productService.listByStoreSlug(req.params.slug, req.auth?.storeId);
      return res.json(products);
    } catch (error: any) {
      log.warn('Product list by slug failed', { slug: req.params.slug, error });
      return respondWithError(req, res, error, 400);
    }
  }

  static async listPublicBySlug(req: Request, res: Response) {
    try {
      if (DEMO_SLUGS.has(req.params.slug)) {
        return res.json(demoProducts);
      }
      log.debug('Product public list request', { slug: req.params.slug });
      const products = await productService.listByStoreSlug(req.params.slug);
      return res.json(products);
    } catch (error: any) {
      log.warn('Product public list failed', { slug: req.params.slug, error });
      return respondWithError(req, res, error, 400);
    }
  }

  static async update(req: Request, res: Response) {
    try {
      log.info('Product update request', { storeId: req.params.storeId, productId: req.params.productId });
      const product = await productService.update(
        req.params.storeId,
        req.params.productId,
        req.body,
        req.auth?.storeId
      );
      log.info('Product updated', { storeId: req.params.storeId, productId: req.params.productId });
      return res.json(product);
    } catch (error: any) {
      log.warn('Product update failed', { storeId: req.params.storeId, productId: req.params.productId, error });
      return respondWithError(req, res, error, 400);
    }
  }

  static async remove(req: Request, res: Response) {
    try {
      log.info('Product remove request', { storeId: req.params.storeId, productId: req.params.productId });
      await productService.remove(req.params.storeId, req.params.productId, req.auth?.storeId);
      log.info('Product removed', { storeId: req.params.storeId, productId: req.params.productId });
      return res.status(204).send();
    } catch (error: any) {
      log.warn('Product remove failed', { storeId: req.params.storeId, productId: req.params.productId, error });
      return respondWithError(req, res, error, 400);
    }
  }
}
