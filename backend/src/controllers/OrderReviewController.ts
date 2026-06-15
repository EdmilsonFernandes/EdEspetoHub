/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: OrderReviewController.ts
 * @Date: 2026-02-13
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
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
    /**
   * Executes resolve access token business logic.
   *
   * @author Edmilson Lopes
   */
private static resolveAccessToken(req: Request) {
    const headerToken =
      typeof req.headers['x-order-access-token'] === 'string'
        ? req.headers['x-order-access-token']
        : '';
    const queryToken = typeof req.query?.accessToken === 'string' ? req.query.accessToken : '';
    const bodyToken = typeof req.body?.accessToken === 'string' ? req.body.accessToken : '';
    return String(headerToken || queryToken || bodyToken || '').trim();
  }

    /**
   * Retrieves data for get by order.
   *
   * @author Edmilson Lopes
   */
static async getByOrder(req: Request, res: Response) {
    try {
      const payload = await orderReviewService.getByOrderId(
        req.params.orderId,
        OrderReviewController.resolveAccessToken(req)
      );
      return res.json(payload);
    } catch (error: any) {
      log.warn('Order review get failed', { orderId: req.params.orderId, error });
      return respondWithError(req, res, error, 400);
    }
  }

    /**
   * Executes submit by order business logic.
   *
   * @author Edmilson Lopes
   */
static async submitByOrder(req: Request, res: Response) {
    try {
      const payload = await orderReviewService.submitByOrderId(
        req.params.orderId,
        req.body || {},
        OrderReviewController.resolveAccessToken(req),
        (req as any).auth?.sub || null
      );
      return res.status(201).json(payload);
    } catch (error: any) {
      log.warn('Order review submit failed', { orderId: req.params.orderId, error });
      return respondWithError(req, res, error, 400);
    }
  }

    /**
   * Lists records for list by store.
   *
   * @author Edmilson Lopes
   */
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

    /**
   * Executes summary by store business logic.
   *
   * @author Edmilson Lopes
   */
static async summaryByStore(req: Request, res: Response) {
    try {
      const payload = await orderReviewService.summaryByStoreId(req.params.storeId, req.auth?.storeId);
      return res.json(payload);
    } catch (error: any) {
      log.warn('Order review summary by store failed', { storeId: req.params.storeId, error });
      return respondWithError(req, res, error, 400);
    }
  }

    /**
   * Lists records for list tip payouts by store.
   *
   * @author Edmilson Lopes
   */
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

    /**
   * Marks workflow state for mark tip payout by store.
   *
   * @author Edmilson Lopes
   */
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

    /**
   * Lists records for list tip payouts for motoboy.
   *
   * @author Edmilson Lopes
   */
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
