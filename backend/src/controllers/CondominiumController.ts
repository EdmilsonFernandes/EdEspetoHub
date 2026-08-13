/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: CondominiumController.ts
 * @Date: 2026-04-12
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
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
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
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

  static async adminCreateUser(req: Request, res: Response) {
    try {
      const payload = await condominiumService.adminCreateCondominiumUser(String(req.params.condominiumId || ''), req.body || {});
      return res.status(201).json(payload);
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

  static async adminReviewAccessRequest(req: Request, res: Response) {
    try {
      const payload = await condominiumService.adminReviewAccessRequest(String(req.params.requestId || ''), req.body || {}, req.auth?.sub);
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async organizerOverview(req: Request, res: Response) {
    try {
      const payload = await condominiumService.organizerOverview(req.auth?.condominiumId);
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async organizerUpdateCondominium(req: Request, res: Response) {
    try {
      const payload = await condominiumService.organizerUpdateCondominium(req.auth?.condominiumId, req.body || {});
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async organizerCreateEvent(req: Request, res: Response) {
    try {
      const payload = await condominiumService.organizerCreateEvent(req.auth?.condominiumId, req.body || {});
      return res.status(201).json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async organizerUpdateEvent(req: Request, res: Response) {
    try {
      const payload = await condominiumService.organizerUpdateEvent(req.auth?.condominiumId, String(req.params.eventId || ''), req.body || {});
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async organizerDeactivateEvent(req: Request, res: Response) {
    try {
      const payload = await condominiumService.organizerDeactivateEvent(req.auth?.condominiumId, String(req.params.eventId || ''));
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async organizerInviteStoreToEvent(req: Request, res: Response) {
    try {
      const payload = await condominiumService.organizerInviteStoreToEvent(
        req.auth?.condominiumId,
        String(req.params.eventId || ''),
        String(req.body?.storeId || ''),
        req.auth?.sub,
        String(req.body?.inviteNote || '')
      );
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async organizerConfirmStoreInEvent(req: Request, res: Response) {
    try {
      const payload = await condominiumService.organizerConfirmStoreInEvent(
        req.auth?.condominiumId,
        String(req.params.eventId || ''),
        String(req.body?.storeId || '')
      );
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async organizerUpdateStoreSettings(req: Request, res: Response) {
    try {
      const payload = await condominiumService.organizerUpdateStoreSettings(
        req.auth?.condominiumId,
        String(req.params.storeId || ''),
        req.body || {}
      );
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async organizerRemoveStore(req: Request, res: Response) {
    try {
      const payload = await condominiumService.organizerRemoveStore(
        req.auth?.condominiumId,
        String(req.params.storeId || '')
      );
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async organizerReviewRequest(req: Request, res: Response) {
    try {
      const payload = await condominiumService.organizerReviewRequest(
        req.auth?.condominiumId,
        String(req.params.requestId || ''),
        req.body || {},
        req.auth?.sub
      );
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

  static async storeUpdatePickupLocation(req: Request, res: Response) {
    try {
      const payload = await condominiumService.storeUpdatePickupLocation(
        String(req.params.storeId || ''),
        String(req.params.condominiumId || ''),
        req.body || {},
        req.auth?.storeId
      );
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async createAccessRequest(req: Request, res: Response) {
    try {
      const payload = await condominiumService.createAccessRequest(req.body || {});
      return res.status(201).json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Lists public condominiums.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
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
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
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
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
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

  /**
   * Lists permanent (non-event) stores linked to one condominium.
   * Powers the "Meu Condomínio" filter in the main hub.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   */
  static async listPermanentStores(req: Request, res: Response) {
    try {
      const payload = await condominiumService.listPermanentStoresBySlug(String(req.params.slug || ''));
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }
}
