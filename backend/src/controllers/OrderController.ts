/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: OrderController.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import { Request, Response } from 'express';
import { OrderService } from '../services/OrderService';
import { OrderEtaServiceV2 } from '../services/OrderEtaServiceV2';
import { AppDataSource } from '../config/database';
import { Motoboy } from '../entities/Motoboy';
import { OrderDelivery } from '../entities/OrderDelivery';
import { OrderPayment } from '../entities/OrderPayment';
import { OrderPaymentService } from '../services/OrderPaymentService';
import { logger } from '../utils/logger';
import { AppError } from '../errors/AppError';
import { respondWithError } from '../errors/respondWithError';
import { env } from '../config/env';
import { createOrderAccessToken } from '../utils/orderAccessToken';

const orderService = new OrderService();
const orderEtaServiceV2 = new OrderEtaServiceV2();
const orderPaymentService = new OrderPaymentService();
const log = logger.child({ scope: 'OrderController' });
const publicEtaStatuses = new Set([
  'pending',
  'preparing',
  'ready',
  'ready_for_delivery',
  'waiting_for_motoboy',
  'in_delivery',
  'dispatched',
]);

function shouldAttachPublicEta(order: any) {
  const normalizedStatus = String(order?.status || '').toLowerCase().trim();
  if (!publicEtaStatuses.has(normalizedStatus)) {
    return false;
  }

  return Boolean(order?.store);
}
/**
 * Provides OrderController functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2025-12-17
 */
export class OrderController {
  /**
   * Executes create logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  static async create(req: Request, res: Response) {
    try {
      log.info('Order create request', { storeId: req.params.storeId });
      const customerUserId =
        String(req.auth?.role || '').toUpperCase() === 'CUSTOMER' ? req.auth?.sub : null;
      const actorRole = String(req.auth?.role || '').trim().toUpperCase() || null;
      const guestPushId = req.body?.guestPushId
        ? String(req.body.guestPushId || '').trim() || null
        : null;
      const order = await orderService.create({
        ...req.body,
        customerUserId,
        actorRole,
        clientIp: req.ip || req.socket?.remoteAddress || null,
        guestPushId,
        storeId: req.params.storeId,
      });
      log.info('Order created', { orderId: order?.id, storeId: req.params.storeId });
      return res.status(201).json({
        ...order,
        accessToken: order?.id ? createOrderAccessToken(order.id) : null,
      });
    } catch (error: any) {
      log.warn('Order create failed', { storeId: req.params.storeId, error });
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
      log.debug('Order list request', { storeId: req.params.storeId });
      const orders = await orderService.listByStoreId(req.params.storeId, req.auth?.storeId);
      return res.json(orders);
    } catch (error: any) {
      log.warn('Order list failed', { storeId: req.params.storeId, error });
      return respondWithError(req, res, error, 400);
    }
  }

  static async listQueue(req: Request, res: Response) {
    try {
      log.debug('Order queue request', { storeId: req.params.storeId });
      const orders = await orderService.listQueueByStoreId(req.params.storeId, req.auth?.storeId);
      return res.json(orders);
    } catch (error: any) {
      log.warn('Order queue failed', { storeId: req.params.storeId, error });
      return respondWithError(req, res, error, 400);
    }
  }




  /**
   * Creates by slug.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  static async createBySlug(req: Request, res: Response) {
    try {
      log.info('Order create by slug request', { slug: req.params.slug });
      const customerUserId =
        String(req.auth?.role || '').toUpperCase() === 'CUSTOMER' ? req.auth?.sub : null;
      const actorRole = String(req.auth?.role || '').trim().toUpperCase() || null;
      const guestPushId = req.body?.guestPushId
        ? String(req.body.guestPushId || '').trim() || null
        : null;
      const order = await orderService.createBySlug({
        ...req.body,
        customerUserId,
        actorRole,
        clientIp: req.ip || req.socket?.remoteAddress || null,
        guestPushId,
        storeSlug: req.params.slug,
      });
      log.info('Order created by slug', { orderId: order?.id, slug: req.params.slug });
      return res.status(201).json({
        ...order,
        accessToken: order?.id ? createOrderAccessToken(order.id) : null,
      });
    } catch (error: any) {
      log.warn('Order create by slug failed', { slug: req.params.slug, error });
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
      log.debug('Order list by slug request', { slug: req.params.slug });
      const orders = await orderService.listByStoreSlug(req.params.slug, req.auth?.storeId);
      return res.json(orders);
    } catch (error: any) {
      log.warn('Order list by slug failed', { slug: req.params.slug, error });
      return respondWithError(req, res, error, 400);
    }
  }

  static async listQueueBySlug(req: Request, res: Response) {
    try {
      log.debug('Order queue by slug request', { slug: req.params.slug });
      const orders = await orderService.listQueueByStoreSlug(req.params.slug, req.auth?.storeId);
      return res.json(orders);
    } catch (error: any) {
      log.warn('Order queue by slug failed', { slug: req.params.slug, error });
      return respondWithError(req, res, error, 400);
    }
  }

  static async getPaymentAudit(req: Request, res: Response) {
    try {
      const includeTechnical = String(req.auth?.role || '').toUpperCase() === 'ADMIN';
      const payload = await orderPaymentService.getAuditByOrderForStore(
        req.params.orderId,
        req.params.storeId,
        req.auth?.storeId,
        includeTechnical
      );
      return res.json(payload);
    } catch (error: any) {
      log.warn('Order payment audit failed', {
        storeId: req.params.storeId,
        orderId: req.params.orderId,
        userId: req.auth?.sub,
        error,
      });
      return respondWithError(req, res, error, 400);
    }
  }




  /**
   * Lists highlights by slug.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
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
   * Lists public table occupancy by slug.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-03-12
   */
  static async listTableStatusBySlug(req: Request, res: Response) {
    try {
      log.debug('Order table status by slug request', { slug: req.params.slug });
      const status = await orderService.listTableStatusBySlug(req.params.slug);
      return res.json(status);
    } catch (error: any) {
      log.warn('Order table status by slug failed', { slug: req.params.slug, error });
      return respondWithError(req, res, error, 400);
    }
  }




  /**
   * Updates status.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  static async updateStatus(req: Request, res: Response) {
    const { status, reason } = req.body;
    try {
      log.info('Order status update request', { orderId: req.params.orderId, status });
      const order = await orderService.updateStatus(req.params.orderId, status, req.auth?.storeId, reason);
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
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
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
   * Updates resources for update fulfillment mode.
   *
   * @author Edmilson Lopes
   */
static async updateFulfillmentMode(req: Request, res: Response) {
    const { fulfillmentMode } = req.body || {};
    try {
      const order = await orderService.updateFulfillmentMode(
        req.params.orderId,
        fulfillmentMode,
        req.auth?.storeId
      );
      return res.json(order);
    } catch (error: any) {
      log.warn('Order fulfillment mode update failed', { orderId: req.params.orderId, error });
      return respondWithError(req, res, error, 400);
    }
  }

    /**
   * Updates resources for update postal shipment.
   *
   * @author Edmilson Lopes
   */
static async updatePostalShipment(req: Request, res: Response) {
    try {
      const result = await orderService.updatePostalShipment(
        req.params.orderId,
        {
          provider: req.body?.provider,
          serviceCode: req.body?.serviceCode,
          serviceName: req.body?.serviceName,
          trackingCode: req.body?.trackingCode,
          trackingUrl: req.body?.trackingUrl,
          markPosted: req.body?.markPosted,
        },
        req.auth?.storeId
      );
      return res.json(result);
    } catch (error: any) {
      log.warn('Order postal shipment update failed', { orderId: req.params.orderId, error });
      return respondWithError(req, res, error, 400);
    }
  }

    /**
   * Executes reopen business logic.
   *
   * @author Edmilson Lopes
   */
static async reopen(req: Request, res: Response) {
    try {
      const order = await orderService.reopenOrder(
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
      return res.json(order);
    } catch (error: any) {
      log.warn('Order reopen failed', { orderId: req.params.orderId, error });
      return respondWithError(req, res, error, 400);
    }
  }

    /**
   * Marks workflow state for mark items as printed.
   *
   * @author Edmilson Lopes
   */
static async markItemsAsPrinted(req: Request, res: Response) {
    try {
      const itemIds = Array.isArray(req.body?.itemIds) ? req.body.itemIds : undefined;
      log.info('Order items mark-as-printed request', {
        orderId: req.params.orderId,
        itemIdsCount: Array.isArray(itemIds) ? itemIds.length : 0,
      });
      const result = await orderService.markItemsAsPrinted(req.params.orderId, itemIds, req.auth?.storeId);
      return res.json(result);
    } catch (error: any) {
      log.warn('Order items mark-as-printed failed', { orderId: req.params.orderId, error });
      return respondWithError(req, res, error, 400);
    }
  }




  /**
   * Gets public.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  static async getPublic(req: Request, res: Response) {
    const { orderId } = req.params;
    try {
      log.debug('Order public get request', { orderId });
      const result = await orderService.getPublicById(orderId);
      if (!result) return respondWithError(req, res, new AppError('ORDER-001', 404), 404);
      const { order, queuePosition, queueSize } = result;
      const correlationId = typeof req.headers[ 'x-correlation-id' ] === 'string'
        ? req.headers[ 'x-correlation-id' ]
        : undefined;
      const deliveryRowPromise =
        order?.type === 'delivery'
          ? AppDataSource.getRepository(OrderDelivery).findOne({ where: { orderId: order.id } as any })
          : Promise.resolve(null);
      const orderPaymentPromise = AppDataSource.getRepository(OrderPayment).findOne({
        where: { orderId: order.id } as any,
      });
      const etaPromise =
        env.etaV2.enabled && shouldAttachPublicEta(order)
          ? orderEtaServiceV2.calculateForOrder(order, queuePosition, correlationId)
          : Promise.resolve(null);
      const [ deliveryRow, orderPayment, eta ] = await Promise.all([
        deliveryRowPromise,
        orderPaymentPromise,
        etaPromise,
      ]);
      const motoboy =
        deliveryRow?.motoboyId
          ? await AppDataSource.getRepository(Motoboy).findOne({
              where: { id: deliveryRow.motoboyId } as any,
              relations: [ 'user' ],
            })
          : null;

      const responsePayload: any = {
        id: order.id,
        status: order.status,
        customerReceivedAt: (order as any).customerReceivedAt || null,
        customerReceivedConfirmedByUserId: (order as any).customerReceivedConfirmedByUserId || null,
        type: order.type,
        fulfillmentMode: (order as any).fulfillmentMode || 'distance',
        condominiumId: (order as any).condominiumId || null,
        condominiumEventId: (order as any).condominiumEventId || null,
        condominiumName: (order as any).condominiumName || null,
        condominiumEventTitle: (order as any).condominiumEventTitle || null,
        condominiumFulfillmentMode: (order as any).condominiumFulfillmentMode || null,
        condominiumUnit: (order as any).condominiumUnit || null,
        condominiumOrder: (order as any).condominiumId
          ? {
              condominiumId: (order as any).condominiumId || null,
              eventId: (order as any).condominiumEventId || null,
              condominiumName: (order as any).condominiumName || null,
              eventTitle: (order as any).condominiumEventTitle || null,
              fulfillmentMode: (order as any).condominiumFulfillmentMode || null,
              unit: (order as any).condominiumUnit || null,
            }
          : null,
        table: order.table,
        customerName: order.customerName,
        phone: order.phone,
        address: order.address,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        payment: orderPayment
          ? {
              id: orderPayment.id,
              status: orderPayment.paymentStatus,
              provider: orderPayment.provider,
              providerId: orderPayment.providerId || null,
              paymentLink: orderPayment.paymentLink || null,
              qrCodeBase64: orderPayment.qrCodeBase64 || null,
              qrCodeText: orderPayment.qrCodeText || null,
              expiresAt: orderPayment.expiresAt || null,
            }
          : null,
        cashTendered: order.cashTendered ?? null,
        total: order.total,
        deliveryFee: order.deliveryFee ?? null,
        shipment: (order as any)?.shipment
          ? {
              provider: (order as any).shipment.provider || null,
              serviceCode: (order as any).shipment.serviceCode || null,
              serviceName: (order as any).shipment.serviceName || null,
              estimatedDays: Number((order as any).shipment?.quotePayload?.estimatedDays || 0) || null,
              trackingCode: (order as any).shipment.trackingCode || null,
              trackingUrl: (order as any).shipment.trackingUrl || null,
              shipmentStatus: (order as any).shipment.shipmentStatus || null,
              postedAt: (order as any).shipment.postedAt || null,
              deliveredAt: (order as any).shipment.deliveredAt || null,
              trackingLastEvent: (order as any).shipment.trackingLastEvent || null,
              trackingLastAt: (order as any).shipment.trackingLastAt || null,
            }
          : null,
        delivery: deliveryRow
          ? {
              status: deliveryRow.status,
              motoboyId: deliveryRow.motoboyId ?? null,
              motoboy: motoboy?.user
                ? {
                    id: motoboy.id,
                    name: motoboy.user.fullName,
                    firstName: String(motoboy.user.fullName || '').trim().split(' ')[0] || null,
                    profileImageUrl: motoboy.user.profileImageUrl || null,
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
      };

      if (eta) {
        responsePayload.eta = {
          totalMinutes: eta.totalMinutes,
          windowMin: eta.windowMin,
          windowMax: eta.windowMax,
          breakdown: {
            prepMinutes: eta.prepMinutes,
            queueMinutes: eta.queueMinutes,
            travelMinutes: eta.travelMinutes,
            bufferMinutes: eta.bufferMinutes,
          },
          travel: {
            distanceKm: eta.distanceKm,
            travelMinutes: eta.travelMinutes,
          },
          confidence: eta.confidence,
          algoVersion: eta.algoVersion,
        };
      }

      return res.json(responsePayload);
    } catch (error: any) {
      log.warn('Order public get failed', { orderId, error });
      return respondWithError(req, res, error, 400);
    }
  }




  /**
   * Gets order tracking (V2).
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-28
   */
  static async getTrackingV2(req: Request, res: Response) {
    const { orderId } = req.params;
    try {
      log.debug('Order tracking v2 request', { orderId });
      const result = await orderService.getPublicById(orderId);
      if (!result) return respondWithError(req, res, new AppError('ORDER-001', 404), 404);
      const { order, queuePosition, queueSize } = result;
      const correlationId = typeof req.headers[ 'x-correlation-id' ] === 'string'
        ? req.headers[ 'x-correlation-id' ]
        : undefined;
      const eta =
        shouldAttachPublicEta(order)
          ? await orderEtaServiceV2.calculateForOrder(order, queuePosition, correlationId)
          : null;

      return res.json({
        id: order.id,
        status: order.status,
        customerReceivedAt: (order as any).customerReceivedAt || null,
        customerReceivedConfirmedByUserId: (order as any).customerReceivedConfirmedByUserId || null,
        type: order.type,
        fulfillmentMode: (order as any).fulfillmentMode || 'distance',
        condominiumId: (order as any).condominiumId || null,
        condominiumEventId: (order as any).condominiumEventId || null,
        condominiumName: (order as any).condominiumName || null,
        condominiumEventTitle: (order as any).condominiumEventTitle || null,
        condominiumFulfillmentMode: (order as any).condominiumFulfillmentMode || null,
        condominiumUnit: (order as any).condominiumUnit || null,
        condominiumOrder: (order as any).condominiumId
          ? {
              condominiumId: (order as any).condominiumId || null,
              eventId: (order as any).condominiumEventId || null,
              condominiumName: (order as any).condominiumName || null,
              eventTitle: (order as any).condominiumEventTitle || null,
              fulfillmentMode: (order as any).condominiumFulfillmentMode || null,
              unit: (order as any).condominiumUnit || null,
            }
          : null,
        createdAt: order.createdAt,
        storeId: order.store?.id || null,
        queuePosition,
        queueSize,
        timeline: [
          {
            status: order.status,
            at: order.createdAt,
          },
        ],
        shipment: (order as any)?.shipment
          ? {
              provider: (order as any).shipment.provider || null,
              serviceCode: (order as any).shipment.serviceCode || null,
              serviceName: (order as any).shipment.serviceName || null,
              estimatedDays: Number((order as any).shipment?.quotePayload?.estimatedDays || 0) || null,
              trackingCode: (order as any).shipment.trackingCode || null,
              trackingUrl: (order as any).shipment.trackingUrl || null,
              shipmentStatus: (order as any).shipment.shipmentStatus || null,
              postedAt: (order as any).shipment.postedAt || null,
              deliveredAt: (order as any).shipment.deliveredAt || null,
              trackingLastEvent: (order as any).shipment.trackingLastEvent || null,
              trackingLastAt: (order as any).shipment.trackingLastAt || null,
            }
          : null,
        eta: eta
          ? {
              totalMinutes: eta.totalMinutes,
              windowMin: eta.windowMin,
              windowMax: eta.windowMax,
              prepMinutes: eta.prepMinutes,
              queueMinutes: eta.queueMinutes,
              travelMinutes: eta.travelMinutes,
              bufferMinutes: eta.bufferMinutes,
              confidence: eta.confidence,
              algoVersion: eta.algoVersion,
            }
          : null,
        travel: eta
          ? {
              distanceKm: eta.distanceKm,
              travelMinutes: eta.travelMinutes,
            }
          : null,
      });
    } catch (error: any) {
      log.warn('Order tracking v2 failed', { orderId, error });
      return respondWithError(req, res, error, 400);
    }
  }
}
