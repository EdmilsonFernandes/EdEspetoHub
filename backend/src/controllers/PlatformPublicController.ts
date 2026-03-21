/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: PlatformPublicController.ts
 * @Date: 2026-01-22
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { Request, Response } from 'express';
import { StoreRepository } from '../repositories/StoreRepository';
<<<<<<< HEAD
import { SubscriptionRepository } from '../repositories/SubscriptionRepository';
=======
>>>>>>> main
import { OrderRepository } from '../repositories/OrderRepository';
import { logger } from '../utils/logger';
import { respondWithError } from '../errors/respondWithError';

const storeRepository = new StoreRepository();
<<<<<<< HEAD
const subscriptionRepository = new SubscriptionRepository();
=======
>>>>>>> main
const orderRepository = new OrderRepository();
const log = logger.child({ scope: 'PlatformPublicController' });

/**
 * Provides PlatformPublicController functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-22
 */
export class PlatformPublicController {
  /**
   * Gets public platform metrics.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-22
   */
  static async metrics(_req: Request, res: Response) {
    try {
      log.debug('Public metrics request');
<<<<<<< HEAD
      const [ totalStores, activeSubscriptions, totalOrders, totalRevenue ] = await Promise.all([
        storeRepository.countAll(),
        subscriptionRepository.countByStatuses([ 'ACTIVE', 'EXPIRING', 'TRIAL' ]),
=======
      const [ totalStores, activeStores, totalOrders, totalRevenue ] = await Promise.all([
        storeRepository.countAll(),
        storeRepository.countActiveForPublicMetrics(),
>>>>>>> main
        orderRepository.countAll(),
        orderRepository.sumAllRevenue(),
      ]);

      return res.json({
        totalStores,
<<<<<<< HEAD
        activeStores: activeSubscriptions,
=======
        activeStores,
>>>>>>> main
        totalOrders,
        totalRevenue,
        updatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      log.warn('Public metrics failed', { error });
      return respondWithError(_req, res, error, 400);
    }
  }
}
