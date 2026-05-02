/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * @file: DeliveryService.ts
 * @Date: 2026-02-09
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import { EntityManager } from 'typeorm';
import { AppDataSource } from '../config/database';
import { AppError } from '../errors/AppError';
import { DeliveryEvent } from '../entities/DeliveryEvent';
import { Motoboy } from '../entities/Motoboy';
import { Order } from '../entities/Order';
import { OrderDelivery } from '../entities/OrderDelivery';
import { PushNotificationService } from './PushNotificationService';
import { logger } from '../utils/logger';

const ACTIVE_DELIVERY_STATUSES = [ 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT' ] as const;
type ActiveDeliveryStatus = (typeof ACTIVE_DELIVERY_STATUSES)[number];

type DeliveryStatus =
  | 'AVAILABLE'
  | ActiveDeliveryStatus
  | 'DELIVERED'
  | 'EXPIRED'
  | 'CANCELED';

const DELIVERY_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  AVAILABLE: [ 'ACCEPTED', 'EXPIRED', 'CANCELED' ],
  ACCEPTED: [ 'PICKED_UP', 'CANCELED' ],
  PICKED_UP: [ 'IN_TRANSIT' ],
  IN_TRANSIT: [ 'DELIVERED' ],
  DELIVERED: [],
  EXPIRED: [],
  CANCELED: [ 'AVAILABLE' ],
};

// Treat NULL/empty legacy rows as AVAILABLE.
const normalizeStatus = (value: any): DeliveryStatus => {
  const normalized = String(value ?? '').trim().toUpperCase();
  return (normalized || 'AVAILABLE') as DeliveryStatus;
};

export class DeliveryService {
  private readonly log = logger.child({ scope: 'DeliveryService' });
  private pushService = new PushNotificationService();

  private deliveryExpireMinutes =
    process.env.DELIVERY_EXPIRE_MINUTES && Number(process.env.DELIVERY_EXPIRE_MINUTES) > 0
      ? Number(process.env.DELIVERY_EXPIRE_MINUTES)
      : 20;

    /**
   * Notifies the customer about motoboy delivery milestones.
   *
   * @author Edmilson Lopes
   */
private dispatchDeliveryProgressPush(
    order: Pick<Order, 'id' | 'customerUserId' | 'guestPushId'> & { store?: { name?: string | null } | null } | null | undefined,
    milestone: 'ACCEPTED' | 'IN_TRANSIT' | 'DELIVERED',
    motoboy?: Motoboy | null
  ) {
    const userId = String(order?.customerUserId || '').trim();
    const guestId = String(order?.guestPushId || '').trim();
    if (!order?.id || (!userId && !guestId)) return;

    const motoboyName = String((motoboy as any)?.name || (motoboy as any)?.user?.name || '').trim();
    const firstName = motoboyName.split(/\s+/)[0] || 'O entregador';
    const orderDisplayId = `#${String(order.id).slice(0, 8)}`;
    const storeName = String(order?.store?.name || '').trim();
    const messages = {
      ACCEPTED: `${firstName} aceitou a entrega do pedido ${orderDisplayId} e está indo retirar.`,
      IN_TRANSIT: `${firstName} retirou o pedido ${orderDisplayId} e saiu para entrega.`,
      DELIVERED: `Pedido ${orderDisplayId} entregue. Obrigado por comprar pelo Já no Caminho.`,
    } as const;
    const payload = {
      title: milestone === 'DELIVERED' ? 'Pedido entregue' : 'Entrega atualizada',
      body: storeName ? `${storeName}: ${messages[milestone]}` : messages[milestone],
      data: {
        url: `https://janocaminho.com.br/pedido/${order.id}`,
        orderId: String(order.id),
        deliveryStatus: milestone,
      },
    };

    if (userId) void this.pushService.notifyCustomerOrderUpdate(userId, payload);
    if (guestId) void this.pushService.notifyGuestOrderUpdate(guestId, payload);
  }

    /**
   * Executes insert event business logic.
   *
   * @author Edmilson Lopes
   */
private async insertEvent(
    manager: EntityManager,
    input: {
      deliveryId: string;
      actorType: 'MOTOBOY' | 'STORE' | 'SYSTEM';
      actorId?: string | null;
      fromStatus?: string | null;
      toStatus: string;
      metadata?: any;
    }
  ) {
    const repo = manager.getRepository(DeliveryEvent);
    const event = repo.create({
      deliveryId: input.deliveryId,
      actorType: input.actorType,
      actorId: input.actorId ?? null,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus,
      metadata: input.metadata ?? null,
    });
    await repo.save(event);
  }

    /**
   * Executes assert transition business logic.
   *
   * @author Edmilson Lopes
   */
private assertTransition(from: DeliveryStatus, to: DeliveryStatus) {
    const allowed = DELIVERY_TRANSITIONS[from] || [];
    if (!allowed.includes(to)) {
      throw new AppError('DELIV-002', 400, { from, to });
    }
  }

    /**
   * Executes ensure queue delivery business logic.
   *
   * @author Edmilson Lopes
   */
async ensureQueueDelivery(order: Order, manager?: EntityManager) {
    if (!order || order.type !== 'delivery') return null;
    if (![ 'ready_for_delivery', 'waiting_for_motoboy' ].includes(String(order.status || ''))) return null;

    const repo = (manager ?? AppDataSource.manager).getRepository(OrderDelivery);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.deliveryExpireMinutes * 60 * 1000);
    const freightValue = order.deliveryFee !== null && order.deliveryFee !== undefined ? Number(order.deliveryFee) : null;

    let delivery = await repo.findOne({ where: { orderId: order.id } });
    if (!delivery) {
      delivery = repo.create({
        orderId: order.id,
        motoboyId: null,
        status: 'AVAILABLE',
        freightValue: freightValue ?? null,
        expiresAt,
      });
      return repo.save(delivery);
    }

    // Reopen the delivery queue entry if it was canceled/expired before.
    const status = normalizeStatus(delivery.status);
    if (status !== 'AVAILABLE') {
      delivery.status = 'AVAILABLE';
      delivery.motoboyId = null;
      delivery.acceptedAt = null;
      delivery.pickedUpAt = null;
      delivery.inTransitAt = null;
      delivery.deliveredAt = null;
    }

    delivery.freightValue = freightValue ?? delivery.freightValue ?? null;
    delivery.expiresAt = expiresAt;
    return repo.save(delivery);
  }

    /**
   * Executes accept delivery business logic.
   *
   * @author Edmilson Lopes
   */
async acceptDelivery(orderId: string, motoboy: Motoboy) {
    const result = await AppDataSource.transaction(async (manager) => {
      const deliveryRepo = manager.getRepository(OrderDelivery);
      const orderRepo = manager.getRepository(Order);

      // R1: Exclusividade (1 entrega ativa por vez) - double protected by DB unique partial index.
      const active = await deliveryRepo
        .createQueryBuilder('od')
        .where('od.motoboy_id = :motoboyId', { motoboyId: motoboy.id })
        .andWhere('od.status IN (:...statuses)', { statuses: ACTIVE_DELIVERY_STATUSES })
        .getOne();
      if (active) throw new AppError('DELIV-001', 409);

      // Lock the order row.
      const order = await orderRepo
        .createQueryBuilder('o')
        .leftJoinAndSelect('o.store', 'store')
        .setLock('pessimistic_write', undefined, ['o'])
        .where('o.id = :orderId', { orderId })
        .getOne();

      if (!order) throw new AppError('ORDER-001', 404);
      if (order.type !== 'delivery') throw new AppError('DELIV-003', 400);
      if (![ 'waiting_for_motoboy', 'ready_for_delivery' ].includes(order.status)) {
        throw new AppError('DELIV-004', 400, { status: order.status });
      }

      // Validate motoboy is linked to the store (active link).
      const link = await manager.query(
        `SELECT 1 FROM motoboy_stores WHERE motoboy_id = $1 AND store_id = $2 AND active = true LIMIT 1`,
        [ motoboy.id, order.store.id ]
      );
      if (!Array.isArray(link) || link.length === 0) throw new AppError('AUTH-003', 403);

      // Ensure a delivery queue row exists and lock it.
      let delivery = await deliveryRepo
        .createQueryBuilder('od')
        .setLock('pessimistic_write')
        .where('od.order_id = :orderId', { orderId })
        .getOne();

      if (!delivery) {
        delivery = deliveryRepo.create({
          orderId,
          motoboyId: null,
          status: 'AVAILABLE',
          freightValue: order.deliveryFee !== null && order.deliveryFee !== undefined ? Number(order.deliveryFee) : null,
          expiresAt: new Date(Date.now() + this.deliveryExpireMinutes * 60 * 1000),
        });
        await deliveryRepo.save(delivery);
      }

      const now = new Date();
      if (delivery.expiresAt && delivery.expiresAt.getTime() < now.getTime() && normalizeStatus(delivery.status) === 'AVAILABLE') {
        delivery.status = 'EXPIRED';
        await deliveryRepo.save(delivery);
        await this.insertEvent(manager, {
          deliveryId: delivery.orderId,
          actorType: 'SYSTEM',
          actorId: null,
          fromStatus: 'AVAILABLE',
          toStatus: 'EXPIRED',
          metadata: { reason: 'expires_at' },
        });
        throw new AppError('DELIV-005', 409);
      }

      // R2: Concorrencia - conditional update ensures only one motoboy wins.
      const prevStatus = normalizeStatus(delivery.status);
      this.assertTransition(prevStatus, 'ACCEPTED');

      try {
        const result = await deliveryRepo
          .createQueryBuilder()
          .update(OrderDelivery)
          .set({
            motoboyId: motoboy.id,
            status: 'ACCEPTED',
            acceptedAt: now,
          })
          .where('order_id = :orderId', { orderId })
          // Legacy rows may have NULL/empty/lowercase status.
          .andWhere("(status IS NULL OR NULLIF(TRIM(status), '') IS NULL OR UPPER(status) = :available)", {
            available: 'AVAILABLE',
          })
          .andWhere('motoboy_id IS NULL')
          .andWhere('(expires_at IS NULL OR expires_at > NOW())')
          .execute();

        if (!result.affected) throw new AppError('DELIV-006', 409);
      } catch (error: any) {
        // Unique partial index hit => motoboy already has an active delivery.
        if (error?.code === '23505') throw new AppError('DELIV-001', 409);
        throw error;
      }

      await this.insertEvent(manager, {
        deliveryId: orderId,
        actorType: 'MOTOBOY',
        actorId: motoboy.id,
        fromStatus: 'AVAILABLE',
        toStatus: 'ACCEPTED',
      });

      const normalizedOrderStatus = String(order.status || '').trim().toLowerCase();
      if (normalizedOrderStatus !== 'waiting_for_motoboy') {
        order.status = 'waiting_for_motoboy';
        await orderRepo.save(order);
      }

      const updated = await deliveryRepo.findOne({ where: { orderId } });
      return { order, delivery: updated };
    });
    this.log.info('Delivery accepted; order remains waiting_for_motoboy until pickup', {
      orderId,
      storeId: String(result?.order?.store?.id || '').trim() || null,
      motoboyId: motoboy.id,
      orderStatus: String(result?.order?.status || '').trim().toLowerCase(),
      deliveryStatus: String(result?.delivery?.status || '').trim().toUpperCase(),
    });
    this.dispatchDeliveryProgressPush(result?.order as any, 'ACCEPTED', motoboy);
    return result;
  }

    /**
   * Executes pickup business logic.
   *
   * @author Edmilson Lopes
   */
async pickup(orderId: string, motoboy: Motoboy) {
    return this.advance(orderId, motoboy, 'PICKED_UP');
  }

    /**
   * Executes start business logic.
   *
   * @author Edmilson Lopes
   */
async start(orderId: string, motoboy: Motoboy) {
    return this.advance(orderId, motoboy, 'IN_TRANSIT');
  }

    /**
   * Executes pickup and start business logic.
   *
   * @author Edmilson Lopes
   */
async pickupAndStart(orderId: string, motoboy: Motoboy) {
    const result = await AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(OrderDelivery);
      const orderRepo = manager.getRepository(Order);

      const delivery = await repo
        .createQueryBuilder('od')
        .setLock('pessimistic_write')
        .where('od.order_id = :orderId', { orderId })
        .getOne();
      if (!delivery) throw new AppError('DELIV-007', 404);
      if (delivery.motoboyId !== motoboy.id) throw new AppError('AUTH-003', 403);

      const from = normalizeStatus(delivery.status);
      this.assertTransition(from, 'PICKED_UP');
      this.assertTransition('PICKED_UP', 'IN_TRANSIT');

      const now = new Date();
      delivery.status = 'IN_TRANSIT';
      delivery.pickedUpAt = delivery.pickedUpAt ?? now;
      delivery.inTransitAt = now;
      await repo.save(delivery);

      await this.insertEvent(manager, {
        deliveryId: orderId,
        actorType: 'MOTOBOY',
        actorId: motoboy.id,
        fromStatus: from,
        toStatus: 'PICKED_UP',
      });
      await this.insertEvent(manager, {
        deliveryId: orderId,
        actorType: 'MOTOBOY',
        actorId: motoboy.id,
        fromStatus: 'PICKED_UP',
        toStatus: 'IN_TRANSIT',
      });

      const order = await orderRepo.findOne({ where: { id: orderId } as any, relations: [ 'store' ] as any });
      if (order) {
        order.status = 'in_delivery';
        await orderRepo.save(order);
      }

      return { order, delivery };
    });
    this.log.info('Delivery pickup confirmed; order moved to in_delivery', {
      orderId,
      motoboyId: motoboy.id,
      orderStatus: String((result as any)?.order?.status || '').trim().toLowerCase(),
      deliveryStatus: String((result as any)?.delivery?.status || '').trim().toUpperCase(),
    });
    this.dispatchDeliveryProgressPush((result as any)?.order, 'IN_TRANSIT', motoboy);
    return result.delivery;
  }

    /**
   * Executes advance business logic.
   *
   * @author Edmilson Lopes
   */
private async advance(orderId: string, motoboy: Motoboy, to: DeliveryStatus) {
    const result = await AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(OrderDelivery);
      const orderRepo = manager.getRepository(Order);
      let order: Order | null = null;
      const delivery = await repo
        .createQueryBuilder('od')
        .setLock('pessimistic_write')
        .where('od.order_id = :orderId', { orderId })
        .getOne();
      if (!delivery) throw new AppError('DELIV-007', 404);
      if (delivery.motoboyId !== motoboy.id) throw new AppError('AUTH-003', 403);

      const from = normalizeStatus(delivery.status);
      this.assertTransition(from, to);

      const now = new Date();
      delivery.status = to;
      if (to === 'PICKED_UP') delivery.pickedUpAt = now;
      if (to === 'IN_TRANSIT') delivery.inTransitAt = now;
      await repo.save(delivery);
      await this.insertEvent(manager, {
        deliveryId: orderId,
        actorType: 'MOTOBOY',
        actorId: motoboy.id,
        fromStatus: from,
        toStatus: to,
      });

      // Once the courier starts the route, we consider the order "in delivery" for store/customer views.
      if (to === 'IN_TRANSIT') {
        order = await orderRepo.findOne({ where: { id: orderId } as any, relations: [ 'store' ] as any });
        if (order) {
          order.status = 'in_delivery';
          await orderRepo.save(order);
        }
      }
      return { order, delivery };
    });
    if (to === 'IN_TRANSIT') {
      this.log.info('Delivery route started via explicit transition', {
        orderId,
        motoboyId: motoboy.id,
        orderStatus: String(result?.order?.status || '').trim().toLowerCase(),
        deliveryStatus: String(result?.delivery?.status || '').trim().toUpperCase(),
      });
      this.dispatchDeliveryProgressPush(result.order as any, 'IN_TRANSIT', motoboy);
    }
    return result.delivery;
  }

    /**
   * Executes complete business logic.
   *
   * @author Edmilson Lopes
   */
async complete(orderId: string, motoboy: Motoboy) {
    const result = await AppDataSource.transaction(async (manager) => {
      const deliveryRepo = manager.getRepository(OrderDelivery);
      const orderRepo = manager.getRepository(Order);

      const delivery = await deliveryRepo
        .createQueryBuilder('od')
        .setLock('pessimistic_write')
        .where('od.order_id = :orderId', { orderId })
        .getOne();
      if (!delivery) throw new AppError('DELIV-007', 404);
      if (delivery.motoboyId !== motoboy.id) throw new AppError('AUTH-003', 403);

      const from = normalizeStatus(delivery.status);
      this.assertTransition(from, 'DELIVERED');

      const now = new Date();
      delivery.status = 'DELIVERED';
      delivery.deliveredAt = now;
      if (!delivery.paymentConfirmedAt) delivery.paymentConfirmedAt = now;
      if (!delivery.paymentConfirmedByMotoboyId) delivery.paymentConfirmedByMotoboyId = motoboy.id;
      await deliveryRepo.save(delivery);

      const order = await orderRepo.findOne({ where: { id: orderId }, relations: [ 'store' ] as any });
      if (order) {
        order.status = 'delivered';
        // Business: motoboy only marks as delivered after receiving payment.
        // So we normalize the payment status here to avoid leaving it as PENDING.
        if (String(order.paymentStatus || '').toUpperCase() !== 'PAID') {
          order.paymentStatus = 'PAID';
        }
        await orderRepo.save(order);
      }

      await this.insertEvent(manager, {
        deliveryId: orderId,
        actorType: 'MOTOBOY',
        actorId: motoboy.id,
        fromStatus: from,
        toStatus: 'DELIVERED',
      });

      return { order, delivery };
    });
    this.log.info('Delivery marked as delivered by motoboy', {
      orderId,
      motoboyId: motoboy.id,
      orderStatus: String(result?.order?.status || '').trim().toLowerCase(),
      deliveryStatus: String(result?.delivery?.status || '').trim().toUpperCase(),
    });
    this.dispatchDeliveryProgressPush(result?.order as any, 'DELIVERED', motoboy);
    return result;
  }

    /**
   * Executes cancel by store business logic.
   *
   * @author Edmilson Lopes
   */
async cancelByStore(orderId: string, storeId: string, reason?: string | null) {
    return AppDataSource.transaction(async (manager) => {
      const deliveryRepo = manager.getRepository(OrderDelivery);
      const orderRepo = manager.getRepository(Order);

      const order = await orderRepo
        .createQueryBuilder('o')
        .leftJoinAndSelect('o.store', 'store')
        .setLock('pessimistic_write', undefined, ['o'])
        .where('o.id = :orderId', { orderId })
        .getOne();
      if (!order) throw new AppError('ORDER-001', 404);
      if (order.store?.id !== storeId) throw new AppError('AUTH-003', 403);
      if (order.type !== 'delivery') throw new AppError('DELIV-003', 400);

      const delivery = await deliveryRepo
        .createQueryBuilder('od')
        .setLock('pessimistic_write')
        .where('od.order_id = :orderId', { orderId })
        .getOne();
      if (!delivery) throw new AppError('DELIV-007', 404);

      const from = normalizeStatus(delivery.status);
      // Business: cancel is only allowed before PICKED_UP.
      if ([ 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED' ].includes(from)) {
        throw new AppError('DELIV-008', 400, { status: from });
      }

      const now = new Date();
      const previousMotoboyId = delivery.motoboyId ?? null;
      // Put back into queue: keep cancellation info on row, but make it AVAILABLE again.
      delivery.status = 'AVAILABLE';
      delivery.motoboyId = null;
      delivery.acceptedAt = null;
      delivery.pickedUpAt = null;
      delivery.inTransitAt = null;
      delivery.deliveredAt = null;
      delivery.canceledAt = now;
      delivery.canceledReason = reason ? String(reason) : null;
      delivery.expiresAt = new Date(now.getTime() + this.deliveryExpireMinutes * 60 * 1000);
      await deliveryRepo.save(delivery);

      // Align order status to queue (so UI da loja volta a chamar motoboy).
      order.status = 'waiting_for_motoboy';
      await orderRepo.save(order);

      await this.insertEvent(manager, {
        deliveryId: orderId,
        actorType: 'STORE',
        actorId: null,
        fromStatus: from,
        toStatus: 'CANCELED',
        metadata: { reason: reason ?? null, previousMotoboyId },
      });
      await this.insertEvent(manager, {
        deliveryId: orderId,
        actorType: 'SYSTEM',
        actorId: null,
        fromStatus: 'CANCELED',
        toStatus: 'AVAILABLE',
      });

      return delivery;
    });
  }

    /**
   * Executes stats business logic.
   *
   * @author Edmilson Lopes
   */
async stats(motoboy: Motoboy, range: 'day' | 'week' | 'month' = 'day') {
    const tz = process.env.APP_TZ || 'America/Sao_Paulo';
    const safeRange = [ 'day', 'week', 'month' ].includes(range) ? range : 'day';

    const delivered = await AppDataSource.query(
      `
      WITH bounds AS (
        SELECT
          (date_trunc($2, now() AT TIME ZONE $1) AT TIME ZONE $1) AS start_at,
          ((date_trunc($2, now() AT TIME ZONE $1) + ('1 ' || $2)::interval) AT TIME ZONE $1) AS end_at
      )
      SELECT
        COALESCE(COUNT(*),0)::int AS delivered_count,
        COALESCE(AVG(EXTRACT(EPOCH FROM (od.delivered_at - od.accepted_at))),0)::float AS avg_seconds
      FROM order_deliveries od, bounds b
      WHERE od.motoboy_id = $3
        AND od.status = 'DELIVERED'
        AND od.delivered_at IS NOT NULL
        AND od.delivered_at >= b.start_at
        AND od.delivered_at < b.end_at
      `,
      [ tz, safeRange, motoboy.id ]
    );

    const canceled = await AppDataSource.query(
      `
      WITH bounds AS (
        SELECT
          (date_trunc($2, now() AT TIME ZONE $1) AT TIME ZONE $1) AS start_at,
          ((date_trunc($2, now() AT TIME ZONE $1) + ('1 ' || $2)::interval) AT TIME ZONE $1) AS end_at
      )
      SELECT COALESCE(COUNT(*),0)::int AS canceled_count
      FROM delivery_events e, bounds b
      WHERE e.to_status = 'CANCELED'
        AND e.created_at >= b.start_at
        AND e.created_at < b.end_at
        AND e.metadata->>'previousMotoboyId' = $3
      `,
      [ tz, safeRange, motoboy.id ]
    );

    const active = await AppDataSource
      .getRepository(OrderDelivery)
      .createQueryBuilder('od')
      .where('od.motoboy_id = :motoboyId', { motoboyId: motoboy.id })
      .andWhere('od.status IN (:...statuses)', { statuses: ACTIVE_DELIVERY_STATUSES })
      .orderBy('od.accepted_at', 'DESC')
      .getOne();

    const last = await AppDataSource
      .getRepository(OrderDelivery)
      .createQueryBuilder('od')
      .where('od.motoboy_id = :motoboyId', { motoboyId: motoboy.id })
      .andWhere('od.status = :status', { status: 'DELIVERED' })
      .andWhere('od.delivered_at IS NOT NULL')
      .orderBy('od.delivered_at', 'DESC')
      .getOne();

    const deliveredCount = Number(delivered?.[0]?.delivered_count || 0);
    const avgSeconds = Number(delivered?.[0]?.avg_seconds || 0);
    const canceledCount = Number(canceled?.[0]?.canceled_count || 0);

    return {
      range: safeRange,
      tz,
      deliveredCount,
      canceledAssignedCount: canceledCount,
      activeDeliveryId: active?.orderId ?? null,
      avgMinutes: avgSeconds > 0 ? Math.round(avgSeconds / 60) : 0,
      lastDeliveredAt: last?.deliveredAt ?? null,
      lastDeliveryId: last?.orderId ?? null,
    };
  }
}

export const deliveryService = new DeliveryService();
