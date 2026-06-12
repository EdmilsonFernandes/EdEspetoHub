/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: ProductController.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import { Request, Response } from 'express';
import { ProductService } from '../services/ProductService';
import { logger } from '../utils/logger';
import { respondWithError } from '../errors/respondWithError';
import { cacheService } from '../services/CacheService';
import { invalidateStoreCache } from '../utils/cacheInvalidation';

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
/**
 * Provides ProductController functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2025-12-17
 */
export class ProductController {
  /**
   * Executes create logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  static async create(req: Request, res: Response) {
    try {
      log.info('Product create request', { storeId: req.params.storeId });
      const product = await productService.create(
        { ...req.body, storeId: req.params.storeId },
        req.auth?.storeId
      );
      await invalidateStoreCache();
      log.info('Product created', { productId: product?.id, storeId: req.params.storeId });
      return res.status(201).json(product);
    } catch (error: any) {
      log.warn('Product create failed', { storeId: req.params.storeId, error });
      return respondWithError(req, res, error, 400);
    }
  }




  /**
   * Executes list logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
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




  /**
   * Lists by slug.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
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




  /**
   * Lists public by slug.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  static async listPublicBySlug(req: Request, res: Response) {
    try {
      if (DEMO_SLUGS.has(req.params.slug)) {
        return res.json(demoProducts);
      }
      log.debug('Product public list request', { slug: req.params.slug });
      const cacheKey = `products:store:slug:${req.params.slug}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }
      const products = await productService.listActiveByStoreSlug(req.params.slug);
      await cacheService.set(cacheKey, products, 120);
      return res.json(products);
    } catch (error: any) {
      log.warn('Product public list failed', { slug: req.params.slug, error });
      return respondWithError(req, res, error, 400);
    }
  }




  /**
   * Executes update logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  static async update(req: Request, res: Response) {
    try {
      log.info('Product update request', { storeId: req.params.storeId, productId: req.params.productId });
      const product = await productService.update(
        req.params.storeId,
        req.params.productId,
        req.body,
        req.auth?.storeId
      );
      await invalidateStoreCache();
      log.info('Product updated', { storeId: req.params.storeId, productId: req.params.productId });
      return res.json(product);
    } catch (error: any) {
      log.warn('Product update failed', { storeId: req.params.storeId, productId: req.params.productId, error });
      return respondWithError(req, res, error, 400);
    }
  }




  /**
   * Executes remove logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  static async remove(req: Request, res: Response) {
    try {
      log.info('Product remove request', { storeId: req.params.storeId, productId: req.params.productId });
      await productService.remove(req.params.storeId, req.params.productId, req.auth?.storeId);
      await invalidateStoreCache();
      log.info('Product removed', { storeId: req.params.storeId, productId: req.params.productId });
      return res.status(204).send();
    } catch (error: any) {
      log.warn('Product remove failed', { storeId: req.params.storeId, productId: req.params.productId, error });
      return respondWithError(req, res, error, 400);
    }
  }

    /**
   * Lists records for list categories.
   *
   * @author Edmilson Lopes
   */
static async listCategories(req: Request, res: Response) {
    try {
      const categories = await productService.listCategoriesByStoreId(req.params.storeId, req.auth?.storeId);
      return res.json(categories);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

    /**
   * Lists records for list public categories by slug.
   *
   * @author Edmilson Lopes
   */
static async listPublicCategoriesBySlug(req: Request, res: Response) {
    try {
      const cacheKey = `categories:store:slug:${req.params.slug}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }
      const categories = await productService.listCategoriesByStoreSlug(req.params.slug);
      await cacheService.set(cacheKey, categories, 120);
      return res.json(categories);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

    /**
   * Sets state or configuration for set category priority.
   *
   * @author Edmilson Lopes
   */
static async setCategoryPriority(req: Request, res: Response) {
    try {
      const payload = await productService.setCategoryPriority(
        req.params.storeId,
        {
          name: req.body?.name,
          priority: req.body?.priority,
        },
        req.auth?.storeId
      );
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

    /**
   * Lists records for list inventory.
   *
   * @author Edmilson Lopes
   */
static async listInventory(req: Request, res: Response) {
    try {
      const payload = await productService.listInventoryByStoreId(
        req.params.storeId,
        {
          status: String(req.query?.status || 'all'),
          query: String(req.query?.query || ''),
          includeNotManaged: String(req.query?.includeNotManaged || 'true') !== 'false',
          limit: Number(req.query?.limit || 250),
          offset: Number(req.query?.offset || 0),
        },
        req.auth?.storeId
      );
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

    /**
   * Retrieves data for get inventory alerts.
   *
   * @author Edmilson Lopes
   */
static async getInventoryAlerts(req: Request, res: Response) {
    try {
      const payload = await productService.getInventoryAlertsByStoreId(req.params.storeId, req.auth?.storeId);
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

    /**
   * Lists records for list inventory movements.
   *
   * @author Edmilson Lopes
   */
static async listInventoryMovements(req: Request, res: Response) {
    try {
      const payload = await productService.listInventoryMovementsByStoreId(
        req.params.storeId,
        {
          productId: String(req.query?.productId || ''),
          limit: Number(req.query?.limit || 100),
          offset: Number(req.query?.offset || 0),
        },
        req.auth?.storeId
      );
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

    /**
   * Executes adjust stock business logic.
   *
   * @author Edmilson Lopes
   */
static async adjustStock(req: Request, res: Response) {
    try {
      const payload = await productService.adjustStock(
        req.params.storeId,
        req.params.productId,
        {
          mode: req.body?.mode,
          quantity: req.body?.quantity,
          reason: req.body?.reason,
          lowStockAlert: req.body?.lowStockAlert,
          manageStock: req.body?.manageStock,
        },
        req.auth?.storeId,
        req.auth?.sub
      );
      await invalidateStoreCache();
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }
}
