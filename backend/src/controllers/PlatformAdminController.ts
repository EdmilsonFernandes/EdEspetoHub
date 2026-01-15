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
import { logger } from '../utils/logger';
import { respondWithError } from '../errors/respondWithError';

const storeRepository = new StoreRepository();
const subscriptionService = new SubscriptionService();
const paymentRepository = new PaymentRepository();
const paymentEventRepository = new PaymentEventRepository();
const orderRepository = new OrderRepository();
const subscriptionRepository = new SubscriptionRepository();
const log = logger.child({ scope: 'PlatformAdminController' });

/**
 * Represents PlatformAdminController.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2025-12-17
 */
export class PlatformAdminController {
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
          return {
            ...store,
            subscription,
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
          return { ...store, subscription, latestPayment };
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

      const storeMetrics = enriched.map((store) => {
        const aggregate = orderAggregateMap.get(store.id);
        const totalOrders = aggregate?.ordersCount || 0;
        const totalRevenue = aggregate?.ordersRevenue || 0;
        const avgTicket = totalOrders ? totalRevenue / totalOrders : 0;
        return {
          id: store.id,
          name: store.name,
          slug: store.slug,
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
          if (subscription?.status === 'ACTIVE') acc.activeSubscriptions += 1;
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
}
