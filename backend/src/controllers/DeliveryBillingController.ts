/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: DeliveryBillingController.ts
 * @Date: 2026-01-29
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import { Request, Response } from 'express';
import { DeliveryBillingService } from '../services/DeliveryBillingService';
import { respondWithError } from '../errors/respondWithError';
import { AppError } from '../errors/AppError';
import { logger } from '../utils/logger';

const deliveryBillingService = new DeliveryBillingService();
const log = logger.child({ scope: 'DeliveryBillingController' });
/**
 * Provides DeliveryBillingController functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2026-01-29
 */
export class DeliveryBillingController {
  /**
   * Gets current delivery billing cycle.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-29
   */
  static async getCurrent(req: Request, res: Response) {
    try {
      const storeId = req.params.storeId;
      if (!storeId) throw new AppError('GEN-002', 400);
      if (req.auth?.storeId && req.auth.storeId !== storeId) throw new AppError('AUTH-003', 403);

      const cycle = await deliveryBillingService.getCurrentCycle(storeId);
      if (!cycle) return res.json({ cycle: null });
      const updated = await deliveryBillingService.ensurePaymentForCycle(storeId);
      return res.json({ cycle: updated });
    } catch (error: any) {
      log.warn('Delivery billing get failed', { error });
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Ensures payment for cycle.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-29
   */
  static async pay(req: Request, res: Response) {
    try {
      const storeId = req.params.storeId;
      if (!storeId) throw new AppError('GEN-002', 400);
      if (req.auth?.storeId && req.auth.storeId !== storeId) throw new AppError('AUTH-003', 403);

      const cycle = await deliveryBillingService.ensurePaymentForCycle(storeId);
      return res.json({ cycle });
    } catch (error: any) {
      log.warn('Delivery billing pay failed', { error });
      return respondWithError(req, res, error, 400);
    }
  }
}
