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

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Gestão de produtos
 */
@RouterController(Tokens.Common.Controller.ProductController, 'v1')
export class ProductController extends BaseController {
  constructor(
    @Inject(Tokens.Common.Service.ProductService) private productService: ProductService
  ) {
    super('/products', 'v1');
  }

  /**
   * @swagger
   * /products/{storeId}:
   *   post:
   *     summary: Cria um novo produto
   *     tags: [Products]
   *     parameters:
   *       - in: path
   *         name: storeId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name: { type: string }
   *               price: { type: number }
   *     responses:
   *       201:
   *         description: Produto criado
   */
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

  /**
   * @swagger
   * /products/{storeId}:
   *   get:
   *     summary: Lista produtos de uma loja
   *     tags: [Products]
   *     parameters:
   *       - in: path
   *         name: storeId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: OK
   */
  @Get('/:storeId')
  async list(req: Request, res: Response) {
    try {
      const products = await this.productService.listByStoreId(req.params.storeId, req.auth?.storeId);
      return this.ok(res, products);
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }

  /**
   * @swagger
   * /products/slug/{slug}:
   *   get:
   *     summary: Lista produtos pelo slug da loja
   *     tags: [Products]
   *     parameters:
   *       - in: path
   *         name: slug
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: OK
   */
  @Get('/slug/:slug')
  async listBySlug(req: Request, res: Response) {
    try {
      const products = await this.productService.listByStoreSlug(req.params.slug, req.auth?.storeId);
      return this.ok(res, products);
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }

  /**
   * @swagger
   * /products/public/{slug}:
   *   get:
   *     summary: Lista produtos públicos de uma loja
   *     tags: [Products]
   *     parameters:
   *       - in: path
   *         name: slug
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: OK
   */
  @Get('/public/:slug')
  async listPublicBySlug(req: Request, res: Response) {
    try {
      const products = await this.productService.listActiveByStoreSlug(req.params.slug);
      return this.ok(res, products);
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }

  /**
   * @swagger
   * /products/{storeId}/{productId}:
   *   put:
   *     summary: Atualiza um produto
   *     tags: [Products]
   *     parameters:
   *       - in: path
   *         name: storeId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *       - in: path
   *         name: productId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: OK
   */
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

  /**
   * @swagger
   * /products/{storeId}/{productId}:
   *   delete:
   *     summary: Remove um produto
   *     tags: [Products]
   *     parameters:
   *       - in: path
   *         name: storeId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *       - in: path
   *         name: productId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       204:
   *         description: Removido
   */
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
