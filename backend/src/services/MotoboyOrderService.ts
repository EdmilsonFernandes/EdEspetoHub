/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: MotoboyOrderService.ts
 * @Date: 2026-01-29
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
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
import { appendOrderTimelineEntry } from '../utils/orderTimeline';
import { User } from '../entities/User';
import { EmailService } from './EmailService';
import { PushNotificationService } from './PushNotificationService';
/**
 * Provides MotoboyOrderService functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2026-01-29
 */
export class MotoboyOrderService {
  private orderRepository = new OrderRepository();
  private orderDeliveryRepository = new OrderDeliveryRepository();
  private motoboyStoreRepository = new MotoboyStoreRepository();
  private deliveryBillingService = new DeliveryBillingService();
  private emailService = new EmailService();
  private pushService = new PushNotificationService();
  private tz = process.env.APP_TZ || 'America/Sao_Paulo';
  private log = logger.child({ scope: 'MotoboyOrderService' });

    /**
   * Executes is delivery order business logic.
   *
   * @author Edmilson Lopes
   */
private isDeliveryOrder(order: Order) {
    return order.type === 'delivery';
  }

  private isCashPaymentMethod(value?: string | null) {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized === 'cash' || normalized === 'dinheiro';
  }

  private formatCurrency(value?: number | null) {
    const amount = Number(value || 0);
    return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  private formatOrderDisplayId(orderId: string) {
    return `#${String(orderId || '').slice(0, 8)}`;
  }

  private async notifyStoreDeliveryCodeBlocked(order: Order, motoboy: Motoboy, attempts: number) {
    const storeId = String(order?.store?.id || '').trim();
    const storeName = String(order?.store?.name || 'Loja').trim();
    const ownerEmail = String(order?.store?.owner?.email || '').trim().toLowerCase();
    const contactEmail = String(order?.store?.settings?.contactEmail || '').trim().toLowerCase();
    const recipients = Array.from(new Set([ownerEmail, contactEmail].filter(Boolean)));
    const orderDisplayId = this.formatOrderDisplayId(order.id);
    const motoboyName = String(motoboy?.user?.fullName || '').trim() || 'Entregador';
    const customerName = String(order?.customerName || '').trim() || 'Cliente';

    await Promise.all(
      recipients.map((recipient) =>
        this.emailService.sendStoreDeliveryCodeLockAlert({
          to: recipient,
          storeName,
          orderId: order.id,
          customerName,
          motoboyName,
          attempts,
        })
      )
    ).catch((error) => {
      this.log.warn('Store email alert failed after delivery code lock', {
        storeId,
        orderId: order.id,
        error,
      });
    });

    if (storeId) {
      await this.pushService
        .notifyStoreUsersSecurityAlert(storeId, {
          title: 'CODIGO BLOQUEADO',
          body: `${motoboyName} bloqueou a entrega ${orderDisplayId} apos ${attempts} tentativas invalidas.`,
          data: {
            url: 'https://janocaminho.com.br/admin/queue',
            orderId: String(order.id),
            notificationType: 'delivery_code_locked',
            motoboyId: String(motoboy.id || ''),
          },
        })
        .catch((error) => {
          this.log.warn('Store push alert failed after delivery code lock', {
            storeId,
            orderId: order.id,
            error,
          });
        });
    }
  }

  /**
   * Lists available orders for a motoboy.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
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
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
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
      type: order.type,
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
    let customerProfileImageUrl: string | null = null;
    if (order.customerUserId) {
      const customerProfile = await AppDataSource.getRepository(User)
        .createQueryBuilder('user')
        .select([ 'user.id', 'user.profileImageUrl' ])
        .where('user.id = :id', { id: order.customerUserId })
        .getOne();
      customerProfileImageUrl = customerProfile?.profileImageUrl || null;
    }
    return { ...order, delivery, customerProfileImageUrl };
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
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-29
   */
  async acceptOrder(orderId: string, motoboy: Motoboy) {
    return deliveryService.acceptDelivery(orderId, motoboy);
  }

    /**
   * Executes pickup order business logic.
   *
   * @author Edmilson Lopes
   */
async pickupOrder(orderId: string, motoboy: Motoboy) {
    // Business: picking up the order already means the courier is starting the route.
    return deliveryService.pickupAndStart(orderId, motoboy);
  }

    /**
   * Executes start order business logic.
   *
   * @author Edmilson Lopes
   */
async startOrder(orderId: string, motoboy: Motoboy) {
    return deliveryService.start(orderId, motoboy);
  }

  /**
   * Confirms payment.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-29
   */
  async confirmPayment(orderId: string, motoboy: Motoboy, cashTendered?: number | null) {
    const delivery = await this.orderDeliveryRepository.findByOrderId(orderId);
    if (!delivery || delivery.motoboyId !== motoboy.id) throw new AppError('MOTO-014', 403);

    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new AppError('ORDER-001', 404);
    if (!this.isDeliveryOrder(order)) throw new AppError('MOTO-010', 400);

    if (this.isCashPaymentMethod(order.paymentMethod)) {
      const fallbackTendered = order.cashTendered !== undefined && order.cashTendered !== null
        ? Number(order.cashTendered)
        : null;
      const effectiveCashTendered = cashTendered !== undefined && cashTendered !== null
        ? Number(cashTendered)
        : fallbackTendered;
      const orderTotal = Number(order.total || 0);

      if (!Number.isFinite(effectiveCashTendered) || Number(effectiveCashTendered) < orderTotal) {
        throw new AppError('MOTO-036', 400, {
          message: `Informe um valor recebido igual ou maior que o total do pedido (${this.formatCurrency(orderTotal)}).`,
          orderTotal,
        });
      }

      order.cashTendered = Number(effectiveCashTendered);
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
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-29
   */
  async markDelivered(orderId: string, motoboy: Motoboy, code?: string) {
    // Validate confirmation code if one was generated
    const deliveryRepo = AppDataSource.getRepository(OrderDelivery);
    const delivery = await deliveryRepo.findOne({ where: { orderId } as any });
    if (delivery?.confirmationCodeBlockedAt) {
      throw new AppError('MOTO-035', 423, {
        blocked: true,
        attempts: Number(delivery.confirmationCodeAttempts || 3),
        message: 'Codigo bloqueado apos 3 tentativas. Contate a loja para concluir a entrega.',
      });
    }
    if (delivery?.confirmationCode && String(delivery.confirmationCode) !== String(code || '').trim()) {
      const nextAttempts = Number(delivery.confirmationCodeAttempts || 0) + 1;
      const shouldBlock = nextAttempts >= 3;
      const blockedAt = shouldBlock ? new Date() : null;

      await deliveryRepo.update(
        { orderId } as any,
        {
          confirmationCodeAttempts: nextAttempts,
          confirmationCodeBlockedAt: blockedAt,
        }
      );

      if (shouldBlock) {
        const order = await this.orderRepository.findById(orderId);
        if (order) {
          await this.notifyStoreDeliveryCodeBlocked(order, motoboy, nextAttempts);
        }
        throw new AppError('MOTO-035', 423, {
          blocked: true,
          attempts: nextAttempts,
          message: 'Codigo bloqueado apos 3 tentativas. Contate a loja para concluir a entrega.',
        });
      }

      throw new AppError('DELIV-CODE', 400, {
        attempts: nextAttempts,
        remainingAttempts: Math.max(0, 3 - nextAttempts),
        message: `Codigo de confirmacao incorreto. Restam ${Math.max(0, 3 - nextAttempts)} tentativa(s).`,
      });
    }
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
      if (delivery?.confirmationCode) {
        await deliveryRepo.update(
          { orderId } as any,
          {
            confirmationCodeAttempts: 0,
            confirmationCodeBlockedAt: null,
          }
        );
      }
      // Auto-finish when delivery was confirmed with code (no need for separate customer confirmation)
      if (delivery?.confirmationCode && code) {
        try {
          result.order.status = "finished";
          result.order.statusTimeline = [...(Array.isArray(result.order.statusTimeline) ? result.order.statusTimeline : []), { status: "finished", at: new Date().toISOString() }];
          await AppDataSource.getRepository(Order).save(result.order);
        } catch { /* non-blocking */ }
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
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
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
    order.statusTimeline = appendOrderTimelineEntry(order.statusTimeline, 'finished');
    const saved = await this.orderRepository.save(order);
    await this.deliveryBillingService.recordDelivery(saved);
    return saved;
  }
}
