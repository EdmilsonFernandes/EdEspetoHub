/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: OrderReviewController.ts
 * @Date: 2026-02-13
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { Request, Response } from 'express';
import { respondWithError } from '../errors/respondWithError';
import { logger } from '../utils/logger';
import { OrderReviewService } from '../services/OrderReviewService';
import { MotoboyService } from '../services/MotoboyService';

const orderReviewService = new OrderReviewService();
const motoboyService = new MotoboyService();
const log = logger.child({ scope: 'OrderReviewController' });

export class OrderReviewController {
  static async getByOrder(req: Request, res: Response) {
    try {
      const payload = await orderReviewService.getByOrderId(req.params.orderId);
      return res.json(payload);
    } catch (error: any) {
      log.warn('Order review get failed', { orderId: req.params.orderId, error });
      return respondWithError(req, res, error, 400);
    }
  }

  static async submitByOrder(req: Request, res: Response) {
    try {
      const payload = await orderReviewService.submitByOrderId(req.params.orderId, req.body || {});
      return res.status(201).json(payload);
    } catch (error: any) {
      log.warn('Order review submit failed', { orderId: req.params.orderId, error });
      return respondWithError(req, res, error, 400);
    }
  }

  static async listByStore(req: Request, res: Response) {
    try {
      const limit = Number(req.query?.limit || 100);
      const payload = await orderReviewService.listByStoreId(req.params.storeId, req.auth?.storeId, limit);
      return res.json(payload);
    } catch (error: any) {
      log.warn('Order review list by store failed', { storeId: req.params.storeId, error });
      return respondWithError(req, res, error, 400);
    }
  }

  static async summaryByStore(req: Request, res: Response) {
    try {
      const payload = await orderReviewService.summaryByStoreId(req.params.storeId, req.auth?.storeId);
      return res.json(payload);
    } catch (error: any) {
      log.warn('Order review summary by store failed', { storeId: req.params.storeId, error });
      return respondWithError(req, res, error, 400);
    }
  }

  static async listTipPayoutsByStore(req: Request, res: Response) {
    try {
      const limit = Number(req.query?.limit || 300);
      const payload = await orderReviewService.listTipPayoutsByStoreId(
        req.params.storeId,
        req.auth?.storeId,
        Number.isFinite(limit) ? limit : 300
      );
      return res.json(payload);
    } catch (error: any) {
      log.warn('Order review tip payouts by store failed', { storeId: req.params.storeId, error });
      return respondWithError(req, res, error, 400);
    }
  }

  static async markTipPayoutByStore(req: Request, res: Response) {
    try {
      const payload = await orderReviewService.markTipPayoutByStoreId(
        req.params.storeId,
        req.params.reviewId,
        req.auth?.storeId,
        req.auth?.sub,
        req.body || {}
      );
      return res.json(payload);
    } catch (error: any) {
      log.warn('Order review mark tip payout failed', {
        storeId: req.params.storeId,
        reviewId: req.params.reviewId,
        error,
      });
      return respondWithError(req, res, error, 400);
    }
  }

  static async listTipPayoutsForMotoboy(req: Request, res: Response) {
    try {
      const motoboy = await motoboyService.getActiveMotoboyByUserId(req.auth?.sub || '');
      const limit = Number(req.query?.limit || 300);
      const payload = await orderReviewService.listTipPayoutsByMotoboyId(
        motoboy.id,
        Number.isFinite(limit) ? limit : 300
      );
      return res.json(payload);
    } catch (error: any) {
      log.warn('Order review tip payouts for motoboy failed', { error });
      return respondWithError(req, res, error, 400);
    }
  }
}
