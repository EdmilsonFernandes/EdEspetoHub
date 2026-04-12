/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: CondominiumController.ts
 * @Date: 2026-04-12
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { Request, Response } from 'express';
import { respondWithError } from '../errors/respondWithError';
import { CondominiumService } from '../services/CondominiumService';
import { logger } from '../utils/logger';

const condominiumService = new CondominiumService();
const log = logger.child({ scope: 'CondominiumController' });

/**
 * Provides CondominiumController functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-04-12
 */
export class CondominiumController {
  /**
   * Lists public condominiums.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-04-12
   */
  static async listPublic(req: Request, res: Response) {
    try {
      log.debug('Public condominium list request');
      const rows = await condominiumService.listPublic();
      return res.json(rows);
    } catch (error: any) {
      log.warn('Public condominium list failed', { error });
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Gets public condominium by slug.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-04-12
   */
  static async getPublicBySlug(req: Request, res: Response) {
    try {
      log.debug('Public condominium detail request', { slug: req.params.slug });
      const row = await condominiumService.getPublicBySlug(String(req.params.slug || ''));
      return res.json(row);
    } catch (error: any) {
      log.warn('Public condominium detail failed', { error });
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Lists public stores linked to one condominium.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-04-12
   */
  static async listPublicStoresBySlug(req: Request, res: Response) {
    try {
      log.debug('Public condominium store list request', { slug: req.params.slug });
      const payload = await condominiumService.listPublicStoresBySlug(String(req.params.slug || ''));
      return res.json(payload);
    } catch (error: any) {
      log.warn('Public condominium store list failed', { error });
      return respondWithError(req, res, error, 400);
    }
  }
}
