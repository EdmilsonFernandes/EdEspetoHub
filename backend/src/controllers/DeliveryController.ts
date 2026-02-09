/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: DeliveryController.ts
 * @Date: 2026-02-09
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { Request, Response } from 'express';
import { deliveryService } from '../services/DeliveryService';
import { respondWithError } from '../errors/respondWithError';
import { logger } from '../utils/logger';

const log = logger.child({ scope: 'DeliveryController' });

export class DeliveryController {
  /**
   * Store cancels a delivery assignment / queue item.
   */
  static async cancel(req: Request, res: Response) {
    try {
      const storeId = req.auth?.storeId || '';
      if (!storeId) return respondWithError(req, res, { code: 'AUTH-003', status: 403 }, 403);
      const reason = req.body?.reason ?? null;
      const delivery = await deliveryService.cancelByStore(req.params.deliveryId, storeId, reason);
      return res.json(delivery);
    } catch (error: any) {
      log.warn('Delivery cancel failed', { error });
      return respondWithError(req, res, error, 400);
    }
  }
}

