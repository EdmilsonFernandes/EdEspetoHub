/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: OrderController.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { Request, Response } from 'express';
import { OrderService } from '../services/OrderService';
import { logger } from '../utils/logger';
import { AppError } from '../errors/AppError';
import { respondWithError } from '../errors/respondWithError';

const orderService = new OrderService();
const log = logger.child({ scope: 'OrderController' });
/**
 * Provides OrderController functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2025-12-17
 */
export class OrderController {
  /**
   * Executes create logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  static async create(req: Request, res: Response) {
    try {
      log.info('Order create request', { storeId: req.params.storeId });
      const order = await orderService.create({ ...req.body, storeId: req.params.storeId });
      log.info('Order created', { orderId: order?.id, storeId: req.params.storeId });
      return res.status(201).json(order);
    } catch (error: any) {
      log.warn('Order create failed', { storeId: req.params.storeId, error });
      return respondWithError(req, res, error, 400);
    }
  }




  /**
   * Executes list logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  static async list(req: Request, res: Response) {
    try {
      log.debug('Order list request', { storeId: req.params.storeId });
      const orders = await orderService.listByStoreId(req.params.storeId, req.auth?.storeId);
      return res.json(orders);
    } catch (error: any) {
      log.warn('Order list failed', { storeId: req.params.storeId, error });
      return respondWithError(req, res, error, 400);
    }
  }




  /**
   * Creates by slug.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  static async createBySlug(req: Request, res: Response) {
    try {
      log.info('Order create by slug request', { slug: req.params.slug });
      const order = await orderService.createBySlug({ ...req.body, storeSlug: req.params.slug });
      log.info('Order created by slug', { orderId: order?.id, slug: req.params.slug });
      return res.status(201).json(order);
    } catch (error: any) {
      log.warn('Order create by slug failed', { slug: req.params.slug, error });
      return respondWithError(req, res, error, 400);
    }
  }




  /**
   * Lists by slug.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  static async listBySlug(req: Request, res: Response) {
    try {
      log.debug('Order list by slug request', { slug: req.params.slug });
      const orders = await orderService.listByStoreSlug(req.params.slug, req.auth?.storeId);
      return res.json(orders);
    } catch (error: any) {
      log.warn('Order list by slug failed', { slug: req.params.slug, error });
      return respondWithError(req, res, error, 400);
    }
  }




  /**
   * Lists highlights by slug.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-21
   */
  static async listHighlightsBySlug(req: Request, res: Response) {
    try {
      log.debug('Order highlights by slug request', { slug: req.params.slug });
      const items = await orderService.listTopItemsBySlug(req.params.slug, 3);
      return res.json(items);
    } catch (error: any) {
      log.warn('Order highlights by slug failed', { slug: req.params.slug, error });
      return respondWithError(req, res, error, 400);
    }
  }




  /**
   * Updates status.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  static async updateStatus(req: Request, res: Response) {
    const { status } = req.body;
    try {
      log.info('Order status update request', { orderId: req.params.orderId, status });
      const order = await orderService.updateStatus(req.params.orderId, status, req.auth?.storeId);
      log.info('Order status updated', { orderId: req.params.orderId, status });
      return res.json(order);
    } catch (error: any) {
      log.warn('Order status update failed', { orderId: req.params.orderId, error });
      return respondWithError(req, res, error, 400);
    }
  }




  /**
   * Updates items.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  static async updateItems(req: Request, res: Response) {
    try {
      log.info('Order items update request', { orderId: req.params.orderId });
      const order = await orderService.updateItems(req.params.orderId, req.body.items || [], req.auth?.storeId);
      log.info('Order items updated', { orderId: req.params.orderId, total: order?.total });
      return res.json({ id: order.id, total: order.total });
    } catch (error: any) {
      log.warn('Order items update failed', { orderId: req.params.orderId, error });
      return respondWithError(req, res, error, 400);
    }
  }




  /**
   * Gets public.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  static async getPublic(req: Request, res: Response) {
    const { orderId } = req.params;
    try {
      log.debug('Order public get request', { orderId });
      const result = await orderService.getPublicById(orderId);
      if (!result) return respondWithError(req, res, new AppError('ORDER-001', 404), 404);
      const { order, queuePosition, queueSize } = result;

      return res.json({
        id: order.id,
        status: order.status,
        type: order.type,
        table: order.table,
        customerName: order.customerName,
        phone: order.phone,
        address: order.address,
        paymentMethod: order.paymentMethod,
        total: order.total,
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
          cookingPoint: item.cookingPoint || null,
          passSkewer: item.passSkewer || false,
        })),
        store: order.store
          ? {
              id: order.store.id,
              name: order.store.name,
              slug: order.store.slug,
              phone: order.store.owner?.phone || null,
                settings: order.store.settings
                  ? {
                      logoUrl: order.store.settings.logoUrl || null,
                      primaryColor: order.store.settings.primaryColor || null,
                      secondaryColor: order.store.settings.secondaryColor || null,
                      pixKey: order.store.settings.pixKey || null,
                    }
                  : null,
            }
          : null,
      });
    } catch (error: any) {
      log.warn('Order public get failed', { orderId, error });
      return respondWithError(req, res, error, 400);
    }
  }
}
