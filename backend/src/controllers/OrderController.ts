/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: OrderController.ts
 */

import { Request, Response } from 'express';
import { OrderService } from '../services/OrderService';
import { OrderEtaServiceV2 } from '../services/OrderEtaServiceV2';
import { OrderDeliveryDao } from '../database/dao/OrderDeliveryDao';
import { MotoboyDao } from '../database/dao/MotoboyDao';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import { BaseController } from './BaseController';
import { Get, Post, Put, Authorize, RouterController } from '../decorators/controller';
import { Tokens } from '../ioc/injectiontokens';
import { Inject } from '../ioc/ioc';
import { DatabaseService } from '../database/data-base.service';
import { CryptoUtil } from '../utils/CryptoUtil';

const log = logger.child({ scope: 'OrderController' });

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Gestão de pedidos
 */
@RouterController(Tokens.Common.Controller.OrderController, 'v1')
export class OrderController extends BaseController {
  constructor(
    @Inject(Tokens.Common.Service.OrderService) private orderService: OrderService,
    @Inject(Tokens.Common.Service.OrderEtaServiceV2) private orderEtaServiceV2: OrderEtaServiceV2,
    @Inject(Tokens.Common.DataLayer.OrderDeliveryRepository) private orderDeliveryDao: OrderDeliveryDao,
    @Inject(Tokens.Common.DataLayer.MotoboyRepository) private motoboyDao: MotoboyDao,
    @Inject(Tokens.Common.DataLayer.DatabaseService) private databaseService: DatabaseService,
    @Inject(Tokens.Utils.CryptoUtil) private cryptoUtil: CryptoUtil
  ) {
    super('/orders', 'v1');
  }

  /**
   * @swagger
   * /orders/{storeId}:
   *   post:
   *     summary: Cria um novo pedido
   *     tags: [Orders]
   *     parameters:
   *       - in: path
   *         name: storeId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       201:
   *         description: Criado
   */
  @Post('/:storeId')
  async create(req: Request, res: Response): Promise<Response> {
    try {
      const order = await this.orderService.create({ ...req.body, storeId: req.params.storeId });
      return this.created(res, {
        ...order,
        accessToken: order?.id ? this.cryptoUtil.createOrderAccessToken(order.id) : null,
      });
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }

  /**
   * @swagger
   * /orders/{storeId}:
   *   get:
   *     summary: Lista pedidos de uma loja
   *     tags: [Orders]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: OK
   */
  @Get('/:storeId')
  @Authorize()
  async list(req: Request, res: Response): Promise<Response> {
    try {
      const orders = await this.orderService.listByStoreId(req.params.storeId, req.auth?.storeId);
      return this.ok(res, orders);
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }

  /**
   * @swagger
   * /orders/public/{orderId}:
   *   get:
   *     summary: Obtém detalhes públicos de um pedido
   *     tags: [Orders]
   *     responses:
   *       200:
   *         description: OK
   */
  @Get('/public/:orderId')
  async getPublic(req: Request, res: Response): Promise<Response> {
    const { orderId } = req.params;
    try {
      const result = await this.orderService.getPublicById(orderId);
      if (!result) return this.notFound(res, 'Order not found');
      const { order, queuePosition, queueSize } = result;
      
      const deliveryRow =
        order?.type === 'delivery'
          ? await this.orderDeliveryDao.findByOrderId(order.id)
          : null;
      
      const motoboy =
        deliveryRow?.motoboyId
          ? await this.motoboyDao.getById(deliveryRow.motoboyId)
          : null;
      
      const responsePayload: any = {
        id: order.id,
        status: order.status,
        type: order.type,
        customerName: order.customerName,
        total: order.total,
        delivery: deliveryRow
          ? {
              status: deliveryRow.status,
              motoboyId: deliveryRow.motoboyId ?? null,
              motoboy: (motoboy as any)?.user
                ? {
                    id: motoboy?.id,
                    name: (motoboy as any).user.fullName,
                    firstName: String((motoboy as any).user.fullName || '').trim().split(' ')[0] || null,
                    profileImageUrl: (motoboy as any).user.profileImageUrl || null,
                  }
                : null,
              acceptedAt: deliveryRow.acceptedAt ?? null,
              pickedUpAt: deliveryRow.pickedUpAt ?? null,
              inTransitAt: deliveryRow.inTransitAt ?? null,
              deliveredAt: deliveryRow.deliveredAt ?? null,
            }
          : null,
        createdAt: order.createdAt,
        queuePosition,
        queueSize,
        items: (order.items || []).map((item) => ({
          id: item.id,
          name: item.product?.name || 'Produto',
          quantity: item.quantity,
          price: item.price,
          productId: item.product?.id,
          imageUrl: item.product?.imageUrl || null,
        })),
      };

      if (env.etaV2.enabled) {
        const eta = await this.orderEtaServiceV2.calculateEta(order as any);
        responsePayload.eta = eta;
      }

      return this.ok(res, responsePayload);
    } catch (error: any) {
      return this.fail(res, error, req);
    }
  }
}
