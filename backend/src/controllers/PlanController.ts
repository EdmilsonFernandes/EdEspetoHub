/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: PlanController.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import { Request, Response } from 'express';
import { PlanService } from '../services/PlanService';
import { logger } from '../utils/logger';
import { respondWithError } from '../errors/respondWithError';
import { AppError } from '../errors/AppError';

const planService = new PlanService();
const log = logger.child({ scope: 'PlanController' });
/**
 * Provides PlanController functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2025-12-17
 */
export class PlanController {
  /**
   * Executes list logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  static async list(req: Request, res: Response) {
    try {
      log.debug('Plan list request');
      const plans = await planService.listEnabled();
      return res.json(plans);
    } catch (error: any) {
      log.warn('Plan list failed', { error });
      return respondWithError(req, res, error, 400);
    }
  }

  static async signupPromotion(req: Request, res: Response) {
    try {
      log.debug('Signup promotion request');
      const promotion = await planService.getSignupPromotionStatus();
      return res.json(promotion);
    } catch (error: any) {
      log.warn('Signup promotion failed', { error });
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Planos visíveis para a loja autenticada: loja fundadora recebe também as
   * variantes fundador (preço vitalício travado) além da tabela pública.
   */
  static async listForStore(req: Request, res: Response) {
    try {
      const storeId = req.params.storeId;
      const authStoreId = (req as any).auth?.storeId;
      if (authStoreId && authStoreId !== storeId) {
        throw new AppError('AUTH-003', 403);
      }
      const result = await planService.listForStore(storeId);
      return res.json(result);
    } catch (error: any) {
      log.warn('Plan list for store failed', { storeId: req.params.storeId, error });
      return respondWithError(req, res, error, 400);
    }
  }
}
