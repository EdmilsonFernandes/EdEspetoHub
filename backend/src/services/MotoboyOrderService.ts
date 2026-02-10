/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: MotoboyOrderService.ts
 * @Date: 2026-01-29
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { AppDataSource } from '../config/database';
import { Order } from '../entities/Order';
import { OrderDelivery } from '../entities/OrderDelivery';
import { AppError } from '../errors/AppError';
import { Motoboy } from '../entities/Motoboy';
import { OrderRepository } from '../repositories/OrderRepository';
import { OrderDeliveryRepository } from '../repositories/OrderDeliveryRepository';
import { MotoboyStoreRepository } from '../repositories/MotoboyStoreRepository';
import { logger } from '../utils/logger';
import { DeliveryBillingService } from './DeliveryBillingService';
import { deliveryService } from './DeliveryService';
/**
 * Provides MotoboyOrderService functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-29
 */
export class MotoboyOrderService {
  private orderRepository = new OrderRepository();
  private orderDeliveryRepository = new OrderDeliveryRepository();
  private motoboyStoreRepository = new MotoboyStoreRepository();
  private deliveryBillingService = new DeliveryBillingService();
  private tz = process.env.APP_TZ || 'America/Sao_Paulo';
  private log = logger.child({ scope: 'MotoboyOrderService' });

  private isDeliveryOrder(order: Order) {
    return order.type === 'delivery';
  }

  /**
   * Lists available orders for a motoboy.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  async listAvailable(motoboy: Motoboy) {
    const storeIds = await this.motoboyStoreRepository.listStoreIds(motoboy.id);
    if (!storeIds.length) return [];
    // Prefer the delivery queue table, but keep a fallback for legacy orders without queue rows.
    const availableOrderStatuses = [ 'waiting_for_motoboy', 'ready_for_delivery' ];
    const expireMinutes =
      process.env.DELIVERY_EXPIRE_MINUTES && Number(process.env.DELIVERY_EXPIRE_MINUTES) > 0
        ? Number(process.env.DELIVERY_EXPIRE_MINUTES)
        : 20;

    // If queue rows exist but have an old/exhausted expires_at, the order can "disappear" from the queue
    // even though the store is still waiting for a motoboy. Refresh those rows on every queue poll.
    try {
      await AppDataSource.query(
        `
        UPDATE order_deliveries od
           SET expires_at = NOW() + ($2 * interval '1 minute'),
               -- If the store is still waiting for a motoboy, keep the delivery entry AVAILABLE
               -- even if a previous expiration job marked it as EXPIRED.
               status = 'AVAILABLE',
               accepted_at = NULL,
               picked_up_at = NULL,
               in_transit_at = NULL,
               delivered_at = NULL,
               canceled_at = NULL,
               canceled_reason = NULL
          FROM orders o
         WHERE o.id = od.order_id
           AND o.type = 'delivery'
           AND o.status = ANY($1::text[])
           AND o.store_id = ANY($3::uuid[])
           AND od.motoboy_id IS NULL
           AND (od.expires_at IS NULL OR od.expires_at < NOW());
        `,
        [ availableOrderStatuses, expireMinutes, storeIds ]
      );
    } catch (error) {
      // Non-fatal: listing still works without refresh, but orders may disappear until another status update.
      this.log.warn('Failed to refresh delivery queue expirations', { error });
    }

    return AppDataSource.getRepository(Order)
      .createQueryBuilder('o')
      .leftJoin(OrderDelivery, 'od', 'od.order_id = o.id')
      .leftJoinAndSelect('o.store', 'store')
      .leftJoinAndSelect('store.settings', 'settings')
      .leftJoinAndSelect('o.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .where('o.type = :type', { type: 'delivery' })
      .andWhere(
        // Ensure we only expose orders that are actually waiting for a motoboy, even if queue rows are stale.
        `(od.order_id IS NULL AND o.status IN (:...statuses)) OR ((COALESCE(NULLIF(UPPER(od.status), ''), 'AVAILABLE') = 'AVAILABLE') AND o.status IN (:...statuses) AND od.motoboy_id IS NULL AND (od.expires_at IS NULL OR od.expires_at > NOW()))`,
        { statuses: availableOrderStatuses }
      )
      .andWhere('o.store_id IN (:...storeIds)', { storeIds })
      .orderBy('o.created_at', 'ASC')
      .getMany();
  }

  /**
   * Lists delivery history for a motoboy.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  async listHistory(motoboy: Motoboy, days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - Math.max(days, 1));

    const repo = AppDataSource.getRepository(Order);
    const orders = await repo
      .createQueryBuilder('o')
      .innerJoin(OrderDelivery, 'od', 'od.order_id = o.id')
      .leftJoinAndSelect('o.store', 'store')
      .leftJoinAndSelect('store.settings', 'settings')
      .leftJoinAndSelect('o.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .where('od.motoboy_id = :motoboyId', { motoboyId: motoboy.id })
      .andWhere('o.status IN (:...statuses)', { statuses: [ 'delivered', 'finished' ] })
      .andWhere('o.created_at >= :since', { since })
      .orderBy('o.created_at', 'DESC')
      .getMany();

    return orders.map((order) => ({
      id: order.id,
      store: order.store
        ? {
            id: order.store.id,
            name: order.store.name,
            slug: order.store.slug,
            settings: order.store.settings
              ? {
                  logoUrl: order.store.settings.logoUrl || null,
                  primaryColor: order.store.settings.primaryColor || null,
                  secondaryColor: order.store.settings.secondaryColor || null,
                  address: order.store.settings.address || null,
                }
              : null,
          }
        : null,
      customerName: order.customerName,
      phone: order.phone,
      address: order.address,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      total: order.total,
      deliveryFee: order.deliveryFee,
      createdAt: order.createdAt,
      items: (order.items || []).map((item: any) => ({
        id: item.id,
        name: item.product?.name || 'Produto',
        quantity: item.quantity,
        price: item.price,
        productId: item.product?.id,
        imageUrl: item.product?.imageUrl || null,
        cookingPoint: item.cookingPoint || null,
        passSkewer: item.passSkewer || false,
      })),
    }));
  }

  /**
   * Returns the currently assigned (active) delivery order for a motoboy.
   */
  async getCurrent(motoboy: Motoboy) {
    const repo = AppDataSource.getRepository(Order);
    const order = await repo
      .createQueryBuilder('o')
      .innerJoin(OrderDelivery, 'od', 'od.order_id = o.id')
      .leftJoinAndSelect('o.store', 'store')
      .leftJoinAndSelect('store.settings', 'settings')
      .leftJoinAndSelect('o.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .where('od.motoboy_id = :motoboyId', { motoboyId: motoboy.id })
      .andWhere('od.delivered_at IS NULL')
      .andWhere('o.type = :type', { type: 'delivery' })
      .andWhere('od.status IN (:...statuses)', { statuses: [ 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT' ] })
      .orderBy('od.assigned_at', 'DESC')
      .getOne();

    if (!order) return null;
    const delivery = await AppDataSource.getRepository(OrderDelivery).findOne({ where: { orderId: order.id } });
    return { ...order, delivery };
  }

  /**
   * Summarizes today's earnings for a motoboy based on delivered orders.
   * Uses a timezone-aware "today" window (default America/Sao_Paulo).
   */
  async getEarningsToday(motoboy: Motoboy) {
    const tz = this.tz;
    const repo = AppDataSource.getRepository(Order);
    const row = await repo
      .createQueryBuilder('o')
      .select('COALESCE(SUM(COALESCE(o.delivery_fee, 0)), 0)', 'total')
      .addSelect('COUNT(*)', 'count')
      .innerJoin(OrderDelivery, 'od', 'od.order_id = o.id')
      .where('od.motoboy_id = :motoboyId', { motoboyId: motoboy.id })
      .andWhere("od.delivered_at >= (date_trunc('day', now() AT TIME ZONE :tz) AT TIME ZONE :tz)", { tz })
      .andWhere("od.delivered_at < ((date_trunc('day', now() AT TIME ZONE :tz) + interval '1 day') AT TIME ZONE :tz)", {
        tz,
      })
      .getRawOne<{ total: string; count: string }>();

    return {
      total: Number(row?.total || 0),
      count: Number(row?.count || 0),
      tz,
    };
  }

  /**
   * Accepts an order for delivery.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  async acceptOrder(orderId: string, motoboy: Motoboy) {
    return deliveryService.acceptDelivery(orderId, motoboy);
  }

  async pickupOrder(orderId: string, motoboy: Motoboy) {
    // Business: picking up the order already means the courier is starting the route.
    return deliveryService.pickupAndStart(orderId, motoboy);
  }

  async startOrder(orderId: string, motoboy: Motoboy) {
    return deliveryService.start(orderId, motoboy);
  }

  /**
   * Confirms payment.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  async confirmPayment(orderId: string, motoboy: Motoboy, cashTendered?: number | null) {
    const delivery = await this.orderDeliveryRepository.findByOrderId(orderId);
    if (!delivery || delivery.motoboyId !== motoboy.id) throw new AppError('MOTO-014', 403);

    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new AppError('ORDER-001', 404);
    if (!this.isDeliveryOrder(order)) throw new AppError('MOTO-010', 400);

    if (order.paymentMethod?.toLowerCase() === 'cash' || order.paymentMethod?.toLowerCase() === 'dinheiro') {
      if (cashTendered !== undefined && cashTendered !== null) {
        order.cashTendered = Number(cashTendered);
      }
    }

    order.paymentStatus = 'PAID';
    await this.orderRepository.save(order);

    delivery.paymentConfirmedAt = new Date();
    delivery.paymentConfirmedByMotoboyId = motoboy.id;
    await this.orderDeliveryRepository.save(delivery);

    return order;
  }

  /**
   * Marks order delivered.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  async markDelivered(orderId: string, motoboy: Motoboy) {
    const result = await deliveryService.complete(orderId, motoboy);
    if (result?.order) {
      // Delivery completion must not fail if billing fails (it can be retried later).
      try {
        await this.deliveryBillingService.recordDelivery(result.order as any);
      } catch (error: any) {
        this.log.warn('recordDelivery failed after markDelivered', {
          orderId,
          motoboyId: motoboy.id,
          error,
        });
      }
      return result.order;
    }
    // fallback: keep old behavior if order not loaded
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new AppError('ORDER-001', 404);
    return order;
  }

  /**
   * Finishes order.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  async finishOrder(orderId: string, motoboy: Motoboy) {
    const delivery = await this.orderDeliveryRepository.findByOrderId(orderId);
    if (!delivery || delivery.motoboyId !== motoboy.id) throw new AppError('MOTO-014', 403);

    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new AppError('ORDER-001', 404);
    if (!this.isDeliveryOrder(order)) throw new AppError('MOTO-010', 400);
    if (!['delivered', 'in_delivery'].includes(order.status)) {
      throw new AppError('MOTO-016', 400);
    }

    order.status = 'finished';
    const saved = await this.orderRepository.save(order);
    await this.deliveryBillingService.recordDelivery(saved);
    return saved;
  }
}
