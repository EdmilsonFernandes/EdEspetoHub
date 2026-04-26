/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: PlatformAdminController.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { Request, Response } from 'express';
import { StoreRepository } from '../repositories/StoreRepository';
import { SubscriptionService } from '../services/SubscriptionService';
import { PaymentRepository } from '../repositories/PaymentRepository';
import { PaymentEventRepository } from '../repositories/PaymentEventRepository';
import { OrderRepository } from '../repositories/OrderRepository';
import { AppDataSource } from '../config/database';
import { SubscriptionRepository } from '../repositories/SubscriptionRepository';
import { AccessLogRepository } from '../repositories/AccessLogRepository';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { respondWithError } from '../errors/respondWithError';
import { AppError } from '../errors/AppError';
import { StoreSettings } from '../entities/StoreSettings';
import { SettingsService } from '../services/SettingsService';
import { Plan } from '../entities/Plan';
import { Subscription } from '../entities/Subscription';
import { Store } from '../entities/Store';
import { PushNotificationService } from '../services/PushNotificationService';
import { CustomerSecurityService } from '../services/CustomerSecurityService';

const storeRepository = new StoreRepository();
const subscriptionService = new SubscriptionService();
const paymentRepository = new PaymentRepository();
const paymentEventRepository = new PaymentEventRepository();
const orderRepository = new OrderRepository();
const subscriptionRepository = new SubscriptionRepository();
const accessLogRepository = new AccessLogRepository();
const settingsService = new SettingsService();
const pushNotificationService = new PushNotificationService();
const customerSecurityService = new CustomerSecurityService();
const log = logger.child({ scope: 'PlatformAdminController' });
/**
 * Provides PlatformAdminController functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2025-12-17
 */
export class PlatformAdminController {
  /**
   * Builds VIP subscription payload.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-28
   */
  private static buildVipSubscription(store: any) {
    const label = store?.settings?.planExemptLabel || 'Cliente VIP';
    return {
      id: `vip-${store?.id || 'store'}`,
      status: 'ACTIVE',
      startDate: store?.createdAt || null,
      endDate: null,
      autoRenew: false,
      plan: {
        id: 'vip',
        name: 'vip',
        displayName: label,
        price: 0,
        durationDays: null,
      },
      planExempt: true,
      planExemptLabel: label,
    };
  }
  /**
   * Lists stores.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  static async listStores(_req: Request, res: Response) {
    try {
      log.debug('Admin list stores request');
      const stores = await storeRepository.findAll();
      const enriched = await Promise.all(
        stores.map(async (store) => {
          const subscription = await subscriptionService.getCurrentByStore(store.id);
          const latestPayment = await paymentRepository.findLatestByStoreId(store.id);
          const vipSubscription = store.settings?.planExempt
            ? PlatformAdminController.buildVipSubscription(store)
            : null;
          return {
            ...store,
            subscription: vipSubscription || subscription,
            latestPayment,
          };
        })
      );
      return res.json(enriched);
    } catch (error: any) {
      log.warn('Admin list stores failed', { error });
      return respondWithError(_req, res, error, 400);
    }
  }




  /**
   * Executes overview logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  static async overview(_req: Request, res: Response) {
    try {
      log.debug('Admin overview request');
      const stores = await storeRepository.findAll();
      const enriched = await Promise.all(
        stores.map(async (store) => {
          const subscription = await subscriptionService.getCurrentByStore(store.id);
          const latestPayment = await paymentRepository.findLatestByStoreId(store.id);
          const vipSubscription = store.settings?.planExempt
            ? PlatformAdminController.buildVipSubscription(store)
            : null;
          return { ...store, subscription: vipSubscription || subscription, latestPayment };
        })
      );

      const paidPayments = await paymentRepository.countByStatus('PAID');
      const pendingPayments = await paymentRepository.countByStatus('PENDING');
      const paidRevenue = await paymentRepository.sumPaidAmounts();
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const totalOrders = await orderRepository.countAll();
      const ordersLast7Days = await orderRepository.countSince(sevenDaysAgo);
      const ordersLast30Days = await orderRepository.countSince(thirtyDaysAgo);
      const ordersRevenueTotal = await orderRepository.sumAllRevenue();
      const ordersRevenueLast7Days = await orderRepository.sumRevenueSince(sevenDaysAgo);
      const ordersRevenueLast30Days = await orderRepository.sumRevenueSince(thirtyDaysAgo);
      const orderAggregates = await orderRepository.aggregateByStore();
      /**
       * Handles order aggregate map.
       *
       * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
       * @date 2025-12-17
       */
      const orderAggregateMap = new Map(orderAggregates.map((row) => [ row.storeId, row ]));
      const churnedStores = await subscriptionRepository.countByStatuses([ 'EXPIRED', 'SUSPENDED' ]);
      const activeUpdated = await subscriptionRepository.countActiveUpdatedSince(thirtyDaysAgo);
      const startedLast30Days = await subscriptionRepository.countStartedSince(thirtyDaysAgo);
      const reactivatedStores = Math.max(activeUpdated - startedLast30Days, 0);

      const topProductsByStore = await AppDataSource.query(`
        SELECT DISTINCT ON (o.store_id)
          o.store_id AS "storeId",
          p.name AS "productName",
          SUM(oi.quantity) AS "quantity"
        FROM order_items oi
        INNER JOIN orders o ON o.id = oi.order_id
        INNER JOIN products p ON p.id = oi.product_id
        GROUP BY o.store_id, p.name
        ORDER BY o.store_id, SUM(oi.quantity) DESC;
      `);
      const topProductMap = new Map(
        (topProductsByStore || []).map((row: any) => [
          row.storeId,
          { name: row.productName, quantity: Number(row.quantity || 0) },
        ])
      );
      /**
       * Handles store metrics.
       *
       * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
       * @date 2025-12-17
       */
      const storeMetrics = enriched.map((store) => {
        const aggregate = orderAggregateMap.get(store.id);
        const totalOrders = aggregate?.ordersCount || 0;
        const totalRevenue = aggregate?.ordersRevenue || 0;
        const avgTicket = totalOrders ? totalRevenue / totalOrders : 0;
        return {
          id: store.id,
          name: store.name,
          slug: store.slug,
          isVip: Boolean(store.settings?.planExempt),
          totalOrders,
          totalRevenue,
          avgTicket,
          status: store.subscription?.status || 'PENDING',
          endDate: store.subscription?.endDate || null,
        };
      });
      const topStoresByRevenue = [ ...storeMetrics ]
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 10);
      const topStoresByOrders = [ ...storeMetrics ]
        .sort((a, b) => b.totalOrders - a.totalOrders)
        .slice(0, 10);

      const summary = enriched.reduce(
        (acc, store) => {
          const subscription = store.subscription;
          // "Ativa" na visão operacional inclui ACTIVE e TRIAL.
          if (subscription?.status === 'ACTIVE' || subscription?.status === 'TRIAL') {
            acc.activeSubscriptions += 1;
          }
          if (subscription?.status === 'EXPIRING') acc.expiringSubscriptions += 1;
          if (subscription?.status === 'EXPIRED') acc.expiredSubscriptions += 1;
          const planName = subscription?.plan?.name || '';
          const durationDays = subscription?.plan?.durationDays || 0;
          const isYearly = planName.includes('yearly') || durationDays >= 360;
          const isMonthly = planName.includes('monthly') || (durationDays > 0 && durationDays <= 31);
          if (isMonthly) acc.monthlyPlans += 1;
          if (isYearly) acc.yearlyPlans += 1;
          if (subscription?.plan?.price) {
            const price = Number(subscription.plan.price);
            acc.mrrProjected += isYearly ? price / 12 : price;
          }
          return acc;
        },
        {
          totalStores: enriched.length,
          activeSubscriptions: 0,
          expiringSubscriptions: 0,
          expiredSubscriptions: 0,
          monthlyPlans: 0,
          yearlyPlans: 0,
          mrrProjected: 0,
          totalOrders,
          ordersLast7Days,
          ordersLast30Days,
          ordersRevenueTotal,
          ordersRevenueLast7Days,
          ordersRevenueLast30Days,
          churnedStores,
          reactivatedStores,
        }
      );

      const recentPayments = await paymentRepository.findRecent(50);
      const paymentEvents = await paymentEventRepository.findRecent(50);

      return res.json({
        summary: {
          ...summary,
          paidPayments,
          pendingPayments,
          paidRevenue,
        },
        stores: enriched.map((store) => {
          const aggregate = orderAggregateMap.get(store.id);
          const topProduct = topProductMap.get(store.id) || null;
          return {
            ...store,
            orderMetrics: aggregate
              ? {
                  totalOrders: aggregate.ordersCount,
                  totalRevenue: aggregate.ordersRevenue,
                  lastOrderAt: aggregate.lastOrderAt,
                }
              : { totalOrders: 0, totalRevenue: 0, lastOrderAt: null },
            topProduct,
          };
        }),
        rankings: {
          byRevenue: topStoresByRevenue,
          byOrders: topStoresByOrders,
        },
        payments: recentPayments,
        paymentEvents,
      });
    } catch (error: any) {
      log.warn('Admin overview failed', { error });
      return respondWithError(_req, res, error, 400);
    }
  }




  /**
   * Executes suspend store logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  static async suspendStore(req: Request, res: Response) {
    const subscriptionId = (req.body?.subscriptionId as string) || req.params.storeId;
    try {
      log.info('Admin suspend store request', { subscriptionId });
      const subscription = await subscriptionService.suspend(subscriptionId);
      return res.json(subscription);
    } catch (error: any) {
      log.warn('Admin suspend store failed', { subscriptionId, error });
      return respondWithError(req, res, error, 400);
    }
  }




  /**
   * Executes reactivate store logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  static async reactivateStore(req: Request, res: Response) {
    const subscriptionId = (req.body?.subscriptionId as string) || req.params.storeId;
    try {
      log.info('Admin reactivate store request', { subscriptionId });
      const subscription = await subscriptionService.activate(subscriptionId);
      return res.json(subscription);
    } catch (error: any) {
      log.warn('Admin reactivate store failed', { subscriptionId, error });
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Updates VIP plan exemption.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-28
   */
  static async updatePlanExempt(req: Request, res: Response) {
    const storeId = req.params.storeId;
    const rawPlanExempt = req.body?.planExempt;
    const planExempt =
      rawPlanExempt === true ||
      rawPlanExempt === 'true' ||
      rawPlanExempt === 1 ||
      rawPlanExempt === '1';
    const label = req.body?.planExemptLabel?.toString().trim();

    try {
      log.info('Admin plan exempt update request', { storeId, planExempt });
      const result = await AppDataSource.transaction(async (manager) => {
        const storeRepo = manager.getRepository(Store);
        const storeSettingsRepo = manager.getRepository(StoreSettings);
        const planRepo = manager.getRepository(Plan);
        const subscriptionRepo = manager.getRepository(Subscription);

        const store = await storeRepo.findOne({ where: { id: storeId }, relations: ['settings'] });
        if (!store) {
          throw new AppError('STORE-001', 404);
        }

        if (!store.settings) {
          store.settings = storeSettingsRepo.create({ store } as Partial<StoreSettings>);
        } else if (!(store.settings as any).store) {
          // Ensure relation is set when settings exists but wasn't hydrated with the store relation.
          (store.settings as any).store = store;
        }

        store.settings.planExempt = planExempt;
        store.settings.planExemptLabel = planExempt ? (label || 'Cliente VIP') : null;

        let subscription = planExempt
          ? null
          : await subscriptionRepo.findOne({
              where: { store: { id: store.id } } as any,
              order: { endDate: 'DESC' } as any,
              relations: ['store', 'store.settings', 'plan'],
            });
        const hasValidPlan = planExempt
          ? true
          : subscriptionService.isActiveSubscription(subscription as any);

        store.open = planExempt ? true : hasValidPlan;
        await storeSettingsRepo.save(store.settings);
        await storeRepo.save(store);

        const finalSub = planExempt ? null : subscription;
        const finalHasValidPlan = planExempt
          ? true
          : subscriptionService.isActiveSubscription(finalSub as any);
        return { store, subscription: finalSub, hasValidPlan: finalHasValidPlan };
      });

      return res.json({
        storeId: result.store.id,
        planExempt: result.store.settings.planExempt,
        planExemptLabel: result.store.settings.planExemptLabel,
        hasValidPlan: result.hasValidPlan,
        shouldOpenRenewal: !planExempt && !result.hasValidPlan,
        lastPlanId: result.subscription?.plan?.id || null,
        lastPlanName: result.subscription?.plan?.name || null,
      });
    } catch (error: any) {
      log.warn('Admin plan exempt update failed', { storeId, error });
      return respondWithError(req, res, error, 400);
    }
  }




  /**
   * Lists payment events.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  static async listPaymentEvents(req: Request, res: Response) {
    const paymentId = req.query.paymentId as string | undefined;
    const storeId = req.query.storeId as string | undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const offset = req.query.offset ? Number(req.query.offset) : 0;

    try {
      log.debug('Admin payment events request', { paymentId, storeId, limit, offset });
      const events = paymentId
        ? await paymentEventRepository.findByPaymentId(paymentId, limit, offset)
        : storeId
          ? await paymentEventRepository.findByStoreId(storeId, limit, offset)
          : await paymentEventRepository.findRecent(limit, offset);
      return res.json(events);
    } catch (error: any) {
      log.warn('Admin payment events failed', { paymentId, storeId, error });
      return respondWithError(req, res, error, 400);
    }
  }




  /**
   * Lists access logs.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  static async listAccessLogs(req: Request, res: Response) {
    try {
      const role = (req.query.role as string | undefined) || undefined;
      const storeId = (req.query.storeId as string | undefined) || undefined;
      const userId = (req.query.userId as string | undefined) || undefined;
      const method = (req.query.method as string | undefined) || undefined;
      const status = req.query.status ? Number(req.query.status) : undefined;
      const search = (req.query.search as string | undefined) || undefined;
      const from = req.query.from ? new Date(String(req.query.from)) : undefined;
      const to = req.query.to ? new Date(String(req.query.to)) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const offset = req.query.offset ? Number(req.query.offset) : 0;

      const logs = await accessLogRepository.list({
        role,
        storeId,
        userId,
        method,
        status,
        search,
        from: from && !Number.isNaN(from.getTime()) ? from : undefined,
        to: to && !Number.isNaN(to.getTime()) ? to : undefined,
        limit,
        offset,
      });

      return res.json(logs);
    } catch (error: any) {
      log.warn('Admin access logs failed', { error });
      return respondWithError(req, res, error, 400);
    }
  }

  static async customerSecurityOverview(req: Request, res: Response) {
    const search = String(req.query.search || '').trim().toLowerCase();
    const blockStatus = String(req.query.blockStatus || 'active').trim().toLowerCase();
    const severity = String(req.query.severity || 'all').trim().toLowerCase();
    const blockType = String(req.query.blockType || 'all').trim().toLowerCase();
    const eventType = String(req.query.eventType || 'all').trim().toLowerCase();
    const limitBlocksRaw = Number(req.query.limitBlocks || 20);
    const limitEventsRaw = Number(req.query.limitEvents || 25);
    const limitBlocks = Number.isFinite(limitBlocksRaw) ? Math.max(5, Math.min(100, limitBlocksRaw)) : 20;
    const limitEvents = Number.isFinite(limitEventsRaw) ? Math.max(5, Math.min(100, limitEventsRaw)) : 25;

    try {
      await customerSecurityService.expireElapsedBlocks();

      const blockParams: any[] = [];
      const blockWhere: string[] = [];
      const eventParams: any[] = [];
      const eventWhere: string[] = [];

      if (blockStatus !== 'all') {
        blockParams.push(blockStatus);
        blockWhere.push(`b.status = $${blockParams.length}`);
      }

      if (severity !== 'all') {
        blockParams.push(severity);
        blockWhere.push(`b.severity = $${blockParams.length}`);
      }

      if (blockType !== 'all') {
        blockParams.push(blockType);
        blockWhere.push(`LOWER(b.block_type) = $${blockParams.length}`);
      }

      if (search) {
        blockParams.push(`%${search}%`);
        const searchIndex = blockParams.length;
        blockWhere.push(
          `(
            LOWER(COALESCE(u.full_name, '')) LIKE $${searchIndex}
            OR LOWER(COALESCE(b.email_snapshot, '')) LIKE $${searchIndex}
            OR COALESCE(b.phone_snapshot, '') LIKE $${searchIndex}
            OR COALESCE(CAST(b.user_id AS text), '') LIKE $${searchIndex}
          )`
        );
      }

      if (eventType !== 'all') {
        eventParams.push(eventType);
        eventWhere.push(`LOWER(e.event_type) = $${eventParams.length}`);
      }

      if (search) {
        eventParams.push(`%${search}%`);
        const searchIndex = eventParams.length;
        eventWhere.push(
          `(
            LOWER(COALESCE(u.full_name, '')) LIKE $${searchIndex}
            OR LOWER(COALESCE(e.email_snapshot, '')) LIKE $${searchIndex}
            OR COALESCE(e.phone_snapshot, '') LIKE $${searchIndex}
            OR LOWER(COALESCE(s.name, '')) LIKE $${searchIndex}
            OR COALESCE(CAST(e.user_id AS text), '') LIKE $${searchIndex}
          )`
        );
      }

      blockParams.push(limitBlocks);
      const blockLimitIndex = blockParams.length;
      eventParams.push(limitEvents);
      const eventLimitIndex = eventParams.length;

      const blockFilterSql = blockWhere.length ? `WHERE ${blockWhere.join(' AND ')}` : '';
      const eventFilterSql = eventWhere.length ? `WHERE ${eventWhere.join(' AND ')}` : '';

      const [blocks, events, summaryRows] = await Promise.all([
        AppDataSource.query(
          `
            SELECT
              b.id,
              b.user_id AS "userId",
              u.full_name AS "userName",
              b.email_snapshot AS "email",
              b.phone_snapshot AS "phone",
              b.block_type AS "blockType",
              b.status,
              b.severity,
              b.reason,
              b.metadata,
              b.blocked_at AS "blockedAt",
              b.blocked_until AS "blockedUntil",
              b.created_by AS "createdBy",
              b.reviewed_by AS "reviewedBy",
              b.created_at AS "createdAt",
              b.updated_at AS "updatedAt"
            FROM customer_security_blocks b
            LEFT JOIN users u ON u.id = b.user_id
            ${blockFilterSql}
            ORDER BY
              CASE WHEN b.status = 'active' THEN 0 ELSE 1 END,
              b.blocked_at DESC,
              b.created_at DESC
            LIMIT $${blockLimitIndex}
          `,
          blockParams
        ),
        AppDataSource.query(
          `
            SELECT
              e.id,
              e.user_id AS "userId",
              u.full_name AS "userName",
              e.email_snapshot AS "email",
              e.phone_snapshot AS "phone",
              e.event_type AS "eventType",
              e.score,
              e.ip_address AS "ipAddress",
              e.store_id AS "storeId",
              s.name AS "storeName",
              s.slug AS "storeSlug",
              e.order_id AS "orderId",
              e.metadata,
              e.created_at AS "createdAt"
            FROM customer_risk_events e
            LEFT JOIN users u ON u.id = e.user_id
            LEFT JOIN stores s ON s.id = e.store_id
            ${eventFilterSql}
            ORDER BY e.created_at DESC
            LIMIT $${eventLimitIndex}
          `,
          eventParams
        ),
        AppDataSource.query(
          `
            SELECT
              (
                SELECT COUNT(*)::int
                  FROM customer_security_blocks
                 WHERE status = 'active'
              ) AS "activeBlocks",
              (
                SELECT COUNT(*)::int
                  FROM customer_security_blocks
                 WHERE status = 'active'
                   AND severity = 'hard'
              ) AS "hardActiveBlocks",
              (
                SELECT COUNT(*)::int
                  FROM customer_security_blocks
                 WHERE status = 'active'
                   AND severity = 'soft'
              ) AS "softActiveBlocks",
              (
                SELECT COUNT(*)::int
                  FROM customer_security_blocks
                 WHERE status = 'active'
                   AND block_type = 'manual_review'
              ) AS "manualReviewBlocks",
              (
                SELECT COUNT(*)::int
                  FROM customer_risk_events
                 WHERE created_at >= NOW() - INTERVAL '24 hours'
              ) AS "eventsLast24h",
              (
                SELECT COUNT(*)::int
                  FROM customer_risk_events
                 WHERE created_at >= NOW() - INTERVAL '24 hours'
                   AND event_type = 'rapid_far_pickup_multi_store'
              ) AS "rapidFarPickupEventsLast24h"
          `
        ),
      ]);

      return res.json({
        filters: {
          search: search || '',
          blockStatus,
          severity,
          blockType,
          eventType,
          limitBlocks,
          limitEvents,
        },
        summary: summaryRows?.[0] || {
          activeBlocks: 0,
          hardActiveBlocks: 0,
          softActiveBlocks: 0,
          manualReviewBlocks: 0,
          eventsLast24h: 0,
          rapidFarPickupEventsLast24h: 0,
        },
        blocks,
        events,
      });
    } catch (error: any) {
      log.warn('Admin customer security overview failed', { search, blockStatus, severity, blockType, eventType, error });
      return respondWithError(req, res, error, 400);
    }
  }

  static async revokeCustomerSecurityBlock(req: Request, res: Response) {
    const blockId = String(req.params.blockId || '').trim();
    const revocationReason = String(req.body?.reason || '').trim() || null;

    try {
      const block = await customerSecurityService.revokeBlock({
        blockId,
        reviewedBy: req.auth?.sub || 'super_admin',
        revocationReason,
      });
      return res.json(block);
    } catch (error: any) {
      log.warn('Admin customer security block revoke failed', { blockId, error });
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Audits queue consistency for delivery statuses and can optionally repair.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-02-27
   */
  static async queueHealth(req: Request, res: Response) {
    const repair =
      String(req.query?.repair || '').toLowerCase() === '1' ||
      String(req.query?.repair || '').toLowerCase() === 'true';
    const storeSlug = String(req.query?.storeSlug || '').trim();
    const storeId = String(req.query?.storeId || '').trim();

    try {
      const params: any[] = [];
      const where: string[] = [
        "o.type = 'delivery'",
        "o.status = 'in_delivery'",
        "od.status = 'DELIVERED'",
      ];

      if (storeId) {
        params.push(storeId);
        where.push(`o.store_id = $${params.length}`);
      }
      if (storeSlug) {
        params.push(storeSlug);
        where.push(`s.slug = $${params.length}`);
      }

      const baseWhere = where.join(' AND ');

      const rows = await AppDataSource.query(
        `
          SELECT o.id AS "orderId",
                 o.status AS "orderStatus",
                 od.status AS "deliveryStatus",
                 o.updated_at AS "orderUpdatedAt",
                 od.delivered_at AS "deliveredAt",
                 s.id AS "storeId",
                 s.slug AS "storeSlug",
                 s.name AS "storeName"
            FROM orders o
            JOIN order_deliveries od ON od.order_id = o.id
            JOIN stores s ON s.id = o.store_id
           WHERE ${baseWhere}
           ORDER BY o.updated_at DESC
           LIMIT 500
        `,
        params
      );

      let repaired = 0;
      if (repair && rows.length > 0) {
        repaired = await AppDataSource.transaction(async (manager) => {
          const result = await manager.query(
            `
              UPDATE orders o
                 SET status = 'delivered'
                FROM order_deliveries od, stores s
               WHERE o.id = od.order_id
                 AND s.id = o.store_id
                 AND ${baseWhere}
            `,
            params
          );
          return Number((result && (result.rowCount ?? result.affectedRows)) || 0);
        });
      }

      return res.json({
        ok: true,
        totalIssues: rows.length,
        repaired,
        filters: {
          storeId: storeId || null,
          storeSlug: storeSlug || null,
          repair,
        },
        issues: rows,
      });
    } catch (error: any) {
      log.warn('Admin queue health failed', { storeId, storeSlug, repair, error });
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Broadcasts push notification to all active app tokens (global topic audience).
   *
   * @author Edmilson Lopes
   */
  static async broadcastPush(req: Request, res: Response) {
    const title = String(req.body?.title || '').trim();
    const body = String(req.body?.body || '').trim();
    const topic = String(req.body?.topic || 'janocaminho_global').trim();
    const url = String(req.body?.url || '').trim();
    const limit = req.body?.limit !== undefined ? Number(req.body.limit) : undefined;

    if (!title || !body) {
      return respondWithError(
        req,
        res,
        new AppError('GEN-002', 400, { message: 'title e body são obrigatórios.' }),
        400
      );
    }

    try {
      log.info('Admin push broadcast request', {
        topic,
        limit: limit || null,
        title,
      });
      const result = await pushNotificationService.broadcastToAllActive(
        {
          title,
          body,
          data: url ? { url } : {},
        },
        { topic, limit }
      );
      return res.json(result);
    } catch (error: any) {
      log.warn('Admin push broadcast failed', { topic, error });
      return respondWithError(req, res, error, 400);
    }
  }
}
