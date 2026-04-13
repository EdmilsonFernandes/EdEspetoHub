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
  static async adminOverview(req: Request, res: Response) {
    try {
      const payload = await condominiumService.adminOverview();
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async adminCreate(req: Request, res: Response) {
    try {
      const payload = await condominiumService.adminCreateCondominium(req.body || {});
      return res.status(201).json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async adminUpdate(req: Request, res: Response) {
    try {
      const payload = await condominiumService.adminUpdateCondominium(String(req.params.condominiumId || ''), req.body || {});
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async adminDeactivate(req: Request, res: Response) {
    try {
      const payload = await condominiumService.adminDeactivateCondominium(String(req.params.condominiumId || ''));
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async adminCreateEvent(req: Request, res: Response) {
    try {
      const payload = await condominiumService.adminCreateEvent(String(req.params.condominiumId || ''), req.body || {});
      return res.status(201).json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async adminUpdateEvent(req: Request, res: Response) {
    try {
      const payload = await condominiumService.adminUpdateEvent(String(req.params.eventId || ''), req.body || {});
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async adminDeactivateEvent(req: Request, res: Response) {
    try {
      const payload = await condominiumService.adminDeactivateEvent(String(req.params.eventId || ''));
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async adminApproveStore(req: Request, res: Response) {
    try {
      const payload = await condominiumService.adminApproveStore(String(req.params.condominiumId || ''), String(req.body?.storeId || ''));
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async adminUpdateStoreSettings(req: Request, res: Response) {
    try {
      const payload = await condominiumService.adminUpdateStoreSettings(
        String(req.params.condominiumId || ''),
        String(req.params.storeId || ''),
        req.body || {}
      );
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async adminAddStoreToEvent(req: Request, res: Response) {
    try {
      const payload = await condominiumService.adminAddStoreToEvent(String(req.params.eventId || ''), String(req.body?.storeId || ''));
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async adminReviewRequest(req: Request, res: Response) {
    try {
      const payload = await condominiumService.adminReviewRequest(String(req.params.requestId || ''), req.body || {}, req.auth?.sub);
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async listStoreOptions(req: Request, res: Response) {
    try {
      const payload = await condominiumService.listStoreCondominiumOptions(String(req.params.storeId || ''), req.auth?.storeId);
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async createStoreRequest(req: Request, res: Response) {
    try {
      const payload = await condominiumService.createStoreRequest(String(req.params.storeId || ''), req.body || {}, req.auth?.storeId);
      return res.status(201).json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async removeStoreCondominium(req: Request, res: Response) {
    try {
      const payload = await condominiumService.removeStoreCondominium(
        String(req.params.storeId || ''),
        String(req.params.condominiumId || ''),
        req.auth?.storeId
      );
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

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
