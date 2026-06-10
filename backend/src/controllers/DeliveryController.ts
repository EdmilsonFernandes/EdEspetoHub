/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * @file: DeliveryController.ts
 * @Date: 2026-02-09
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
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

  /**
   * Store reports an in-route delivery issue without cancelling the order.
   */
  static async reportIssue(req: Request, res: Response) {
    try {
      const storeId = req.auth?.storeId || '';
      if (!storeId) return respondWithError(req, res, { code: 'AUTH-003', status: 403 }, 403);
      const result = await deliveryService.reportIssueByStore(req.params.deliveryId, storeId, req.body || {});
      return res.json(result);
    } catch (error: any) {
      log.warn('Delivery issue report failed', { error });
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Store unlocks delivery confirmation code attempts after customer support validates the case.
   */
  static async resetConfirmationCode(req: Request, res: Response) {
    try {
      const storeId = req.auth?.storeId || '';
      if (!storeId) return respondWithError(req, res, { code: 'AUTH-003', status: 403 }, 403);
      const result = await deliveryService.resetConfirmationCodeByStore(req.params.deliveryId, storeId, req.body || {});
      return res.json(result);
    } catch (error: any) {
      log.warn('Delivery code reset failed', { error });
      return respondWithError(req, res, error, 400);
    }
  }
}
