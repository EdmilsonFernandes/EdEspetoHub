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
import { createOrderAccessToken } from '../utils/orderAccessToken';
import { BaseController } from './BaseController';
import { Get, Post, Put, Authorize, RouterController } from '../decorators/controller';
import { Tokens } from '../ioc/injectiontokens';
import { Inject } from '../ioc/ioc';
import { DatabaseService } from '../database/data-base.service';

const log = logger.child({ scope: 'OrderController' });

@RouterController(Tokens.Common.Controller.OrderController)
export class OrderController extends BaseController {
  constructor(
    @Inject(Tokens.Common.Service.OrderService) private orderService: OrderService,
    @Inject(Tokens.Common.Service.OrderEtaServiceV2) private orderEtaServiceV2: OrderEtaServiceV2,
    @Inject(Tokens.Common.DataLayer.OrderDeliveryRepository) private orderDeliveryDao: OrderDeliveryDao,
    @Inject(Tokens.Common.DataLayer.MotoboyRepository) private motoboyDao: MotoboyDao,
    @Inject(Tokens.Common.DataLayer.DatabaseService) private databaseService: DatabaseService
  ) {
    super('/orders');
  }

  @Post('/:storeId')
  async create(req: Request, res: Response) {
    try {
      log.info('Order create request', { storeId: req.params.storeId });
      const order = await this.orderService.create({ ...req.body, storeId: req.params.storeId });
      log.info('Order created', { orderId: order?.id, storeId: req.params.storeId });
      return this.created(res, {
        ...order,
        accessToken: order?.id ? createOrderAccessToken(order.id) : null,
      });
    } catch (error: any) {
      log.warn('Order create failed', { storeId: req.params.storeId, error });
      return this.fail(res, error, req);
    }
  }

  @Get('/:storeId')
  @Authorize()
  async list(req: Request, res: Response) {
    try {
      log.debug('Order list request', { storeId: req.params.storeId });
      const orders = await this.orderService.listByStoreId(req.params.storeId, req.auth?.storeId);
      return this.ok(res, orders);
    } catch (error: any) {
      log.warn('Order list failed', { storeId: req.params.storeId, error });
      return this.fail(res, error, req);
    }
  }

  @Post('/slug/:slug')
  async createBySlug(req: Request, res: Response) {
    try {
      log.info('Order create by slug request', { slug: req.params.slug });
      const order = await this.orderService.createBySlug({ ...req.body, storeSlug: req.params.slug });
      log.info('Order created by slug', { orderId: order?.id, slug: req.params.slug });
      return this.created(res, {
        ...order,
        accessToken: order?.id ? createOrderAccessToken(order.id) : null,
      });
    } catch (error: any) {
      log.warn('Order create by slug failed', { slug: req.params.slug, error });
      return this.fail(res, error, req);
    }
  }

  @Get('/slug/:slug')
  @Authorize()
  async listBySlug(req: Request, res: Response) {
    try {
      log.debug('Order list by slug request', { slug: req.params.slug });
      const orders = await this.orderService.listByStoreSlug(req.params.slug, req.auth?.storeId);
      return this.ok(res, orders);
    } catch (error: any) {
      log.warn('Order list by slug failed', { slug: req.params.slug, error });
      return this.fail(res, error, req);
    }
  }

  @Get('/slug/:slug/highlights')
  async listHighlightsBySlug(req: Request, res: Response) {
    try {
      log.debug('Order highlights by slug request', { slug: req.params.slug });
      const items = await this.orderService.listTopItemsBySlug(req.params.slug, 3);
      return this.ok(res, items);
    } catch (error: any) {
      log.warn('Order highlights by slug failed', { slug: req.params.slug, error });
      return this.fail(res, error, req);
    }
  }

  @Get('/slug/:slug/table-status')
  async listTableStatusBySlug(req: Request, res: Response) {
    try {
      log.debug('Order table status by slug request', { slug: req.params.slug });
      const status = await this.orderService.listTableStatusBySlug(req.params.slug);
      return this.ok(res, status);
    } catch (error: any) {
      log.warn('Order table status by slug failed', { slug: req.params.slug, error });
      return this.fail(res, error, req);
    }
  }

  @Put('/:orderId/status')
  @Authorize()
  async updateStatus(req: Request, res: Response) {
    const { status } = req.body;
    try {
      log.info('Order status update request', { orderId: req.params.orderId, status });
      const order = await this.orderService.updateStatus(req.params.orderId, status, req.auth?.storeId);
      log.info('Order status updated', { orderId: req.params.orderId, status });
      return this.ok(res, order);
    } catch (error: any) {
      log.warn('Order status update failed', { orderId: req.params.orderId, error });
      return this.fail(res, error, req);
    }
  }

  @Put('/:orderId/items')
  @Authorize()
  async updateItems(req: Request, res: Response) {
    try {
      log.info('Order items update request', { orderId: req.params.orderId });
      const order = await this.orderService.updateItems(req.params.orderId, req.body.items || [], req.auth?.storeId);
      log.info('Order items updated', { orderId: req.params.orderId, total: order?.total });
      return this.ok(res, { id: order.id, total: order.total });
    } catch (error: any) {
      log.warn('Order items update failed', { orderId: req.params.orderId, error });
      return this.fail(res, error, req);
    }
  }

  @Post('/:orderId/reopen')
  @Authorize()
  async reopen(req: Request, res: Response) {
    try {
      const order = await this.orderService.reopenOrder(
        req.params.orderId,
        {
          reason: req.body?.reason,
          adminIdentifier: req.body?.adminIdentifier,
          adminPassword: req.body?.adminPassword,
        },
        {
          storeId: req.auth?.storeId,
          role: req.auth?.role,
          sub: req.auth?.sub,
        }
      );
      return this.ok(res, order);
    } catch (error: any) {
      log.warn('Order reopen failed', { orderId: req.params.orderId, error });
      return this.fail(res, error, req);
    }
  }

  @Post('/:orderId/mark-as-printed')
  @Authorize()
  async markItemsAsPrinted(req: Request, res: Response) {
    try {
      const itemIds = Array.isArray(req.body?.itemIds) ? req.body.itemIds : undefined;
      log.info('Order items mark-as-printed request', {
        orderId: req.params.orderId,
        itemIdsCount: Array.isArray(itemIds) ? itemIds.length : 0,
      });
      const result = await this.orderService.markItemsAsPrinted(req.params.orderId, itemIds, req.auth?.storeId);
      return this.ok(res, result);
    } catch (error: any) {
      log.warn('Order items mark-as-printed failed', { orderId: req.params.orderId, error });
      return this.fail(res, error, req);
    }
  }

  @Get('/public/:orderId')
  async getPublic(req: Request, res: Response) {
    const { orderId } = req.params;
    try {
      log.debug('Order public get request', { orderId });
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
        table: order.table,
        customerName: order.customerName,
        phone: order.phone,
        address: order.address,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        cashTendered: order.cashTendered ?? null,
        total: order.total,
        deliveryFee: order.deliveryFee ?? null,
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
          isPrinted: Boolean((item as any).isPrinted),
          productId: item.product?.id,
          imageUrl: item.product?.imageUrl || null,
          cookingPoint: item.cookingPoint || null,
          passSkewer: item.passSkewer || false,
          selectedModifiers: item.selectedModifiers || [],
        })),
        store: (order as any).store
          ? {
              id: (order as any).store.id,
              name: (order as any).store.name,
              slug: (order as any).store.slug,
              phone: (order as any).store.owner?.phone || null,
                settings: (order as any).store.settings
                  ? {
                      logoUrl: (order as any).store.settings.logoUrl || null,
                      primaryColor: (order as any).store.settings.primaryColor || null,
                      secondaryColor: (order as any).store.settings.secondaryColor || null,
                      pixKey: (order as any).store.settings.pixKey || null,
                    }
                  : null,
            }
          : null,
      };

      if (env.etaV2.enabled) {
        const eta = await this.orderEtaServiceV2.calculateEta(order);
        responsePayload.eta = eta;
      }

      return this.ok(res, responsePayload);
    } catch (error: any) {
      log.warn('Order public get failed', { orderId, error });
      return this.fail(res, error, req);
    }
  }

  @Get('/tracking/:orderId')
  async getTrackingV2(req: Request, res: Response) {
    const { orderId } = req.params;
    try {
      log.debug('Order tracking v2 request', { orderId });
      const result = await this.orderService.getPublicById(orderId);
      if (!result) return this.notFound(res, 'Order not found');
      const { order, queuePosition, queueSize } = result;
      
      const eta = await this.orderEtaServiceV2.calculateEta(order);

      return this.ok(res, {
        id: order.id,
        status: order.status,
        type: order.type,
        createdAt: order.createdAt,
        storeId: (order as any).store?.id || null,
        queuePosition,
        queueSize,
        timeline: [
          {
            status: order.status,
            at: order.createdAt,
          },
        ],
        eta,
      });
    } catch (error: any) {
      log.warn('Order tracking v2 failed', { orderId, error });
      return this.fail(res, error, req);
    }
  }
}
