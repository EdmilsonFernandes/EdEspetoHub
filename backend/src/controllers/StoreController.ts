/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: StoreController.ts
 */

import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { Authorize, Get, RouterController } from '../decorators/controller';
import { Tokens } from '../ioc/injectiontokens';
import { Inject } from '../ioc/ioc';
import { StoreService } from '../services/StoreService';

/**
 * @swagger
 * tags:
 *   name: Stores
 *   description: Gestão de lojas
 */
@RouterController(Tokens.Common.Controller.StoreController, 'v1')
export class StoreController extends BaseController {
  constructor(
    @Inject(Tokens.Common.Service.StoreService) private storeService: StoreService
  ) {
    super('/stores', 'v1');
  }

  /**
   * @swagger
   * /stores:
   *   get:
   *     summary: Lista todas as lojas (requer autenticação)
   *     tags: [Stores]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Lista de lojas retornada com sucesso
   */
  @Get('/')
  @Authorize()
  public async getAll(req: Request, res: Response) {
    try {
      const stores = await this.storeService.getAllStores();
      return this.ok(res, stores);
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }

  /**
   * @swagger
   * /stores/{id}:
   *   get:
   *     summary: Busca uma loja pelo ID (requer autenticação)
   *     tags: [Stores]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Loja encontrada
   *       404:
   *         description: Loja não encontrada
   */
  @Get('/:id')
  @Authorize()
  public async getById(req: Request, res: Response) {
    try {
      const store = await this.storeService.getStoreById(req.params.id);
      if (!store) {
        return this.notFound(res, 'Store not found');
      }
      return this.ok(res, store);
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }
}
