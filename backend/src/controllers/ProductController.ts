/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: ProductController.ts
 */

import { Request, Response } from 'express';
import { ProductService } from '../services/ProductService';
import { logger } from '../utils/logger';
import { BaseController } from './BaseController';
import { Get, Post, Put, Delete, RouterController } from '../decorators/controller';
import { Tokens } from '../ioc/injectiontokens';
import { Inject } from '../ioc/ioc';

const log = logger.child({ scope: 'ProductController' });

@RouterController(Tokens.Common.Controller.ProductController)
export class ProductController extends BaseController {
  constructor(
    @Inject(Tokens.Common.Service.ProductService) private productService: ProductService
  ) {
    super('/products');
  }

  @Post('/:storeId')
  async create(req: Request, res: Response) {
    try {
      const product = await this.productService.create(
        { ...req.body, storeId: req.params.storeId },
        req.auth?.storeId
      );
      return this.created(res, product);
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }

  @Get('/:storeId')
  async list(req: Request, res: Response) {
    try {
      const products = await this.productService.listByStoreId(req.params.storeId, req.auth?.storeId);
      return this.ok(res, products);
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }

  @Get('/slug/:slug')
  async listBySlug(req: Request, res: Response) {
    try {
      const products = await this.productService.listByStoreSlug(req.params.slug, req.auth?.storeId);
      return this.ok(res, products);
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }

  @Get('/public/:slug')
  async listPublicBySlug(req: Request, res: Response) {
    try {
      const products = await this.productService.listActiveByStoreSlug(req.params.slug);
      return this.ok(res, products);
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }

  @Put('/:storeId/:productId')
  async update(req: Request, res: Response) {
    try {
      const product = await this.productService.update(
        req.params.storeId,
        req.params.productId,
        req.body,
        req.auth?.storeId
      );
      return this.ok(res, product);
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }

  @Delete('/:storeId/:productId')
  async remove(req: Request, res: Response) {
    try {
      await this.productService.remove(req.params.storeId, req.params.productId, req.auth?.storeId);
      return res.status(204).send();
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }
}
