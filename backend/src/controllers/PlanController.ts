/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: PlanController.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { Request, Response } from 'express';
import { PlanService } from '../services/PlanService';
import { logger } from '../utils/logger';
import { respondWithError } from '../errors/respondWithError';

const planService = new PlanService();
const log = logger.child({ scope: 'PlanController' });
/**
 * Provides PlanController functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2025-12-17
 */
export class PlanController {
  /**
   * Executes list logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
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
}