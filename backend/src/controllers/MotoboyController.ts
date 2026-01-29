/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: MotoboyController.ts
 * @Date: 2026-01-29
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { Request, Response } from 'express';
import { MotoboyService } from '../services/MotoboyService';
import { MotoboyOrderService } from '../services/MotoboyOrderService';
import { respondWithError } from '../errors/respondWithError';
import { logger } from '../utils/logger';
import { handleControllerError } from '../utils/handleControllerError';

const motoboyService = new MotoboyService();
const motoboyOrderService = new MotoboyOrderService();
const log = logger.child({ scope: 'MotoboyController' });
/**
 * Provides MotoboyController functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-29
 */
export class MotoboyController {
  /**
   * Lists available orders for motoboy.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  static async listAvailableOrders(req: Request, res: Response) {
    try {
      const motoboy = await motoboyService.getActiveMotoboyByUserId(req.auth?.sub || '');
      const orders = await motoboyOrderService.listAvailable(motoboy);
      return res.json(orders);
    } catch (error: any) {
      log.warn('Motoboy list available failed', { error });
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Lists motoboys linked to a store.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  static async listByStore(req: Request, res: Response) {
    try {
      const links = await motoboyService.listByStore(req.params.storeId, req.auth?.sub || '');
      return res.json(
        links.map((link) => ({
          id: link.id,
          active: link.active,
          storeId: link.storeId,
          motoboyId: link.motoboyId,
          motoboyStatus: link.motoboy?.status,
          motoboyUser: link.motoboy?.user
            ? {
                id: link.motoboy.user.id,
                fullName: link.motoboy.user.fullName,
                email: link.motoboy.user.email,
                phone: link.motoboy.user.phone,
              }
            : null,
          createdAt: link.createdAt,
        }))
      );
    } catch (error) {
      return handleControllerError(error, res);
    }
  }

  /**
   * Uploads a motoboy document (selfie/CPF/CNH).
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  static async uploadDocument(req: Request, res: Response) {
    try {
      const motoboy = await motoboyService.getMotoboyByUserId(req.auth?.sub || '');
      const result = await motoboyService.uploadDocument(motoboy, req.body);
      return res.status(201).json(result);
    } catch (error) {
      return handleControllerError(error, res);
    }
  }

  /**
   * Lists documents for a motoboy.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  static async listDocuments(req: Request, res: Response) {
    try {
      const documents = await motoboyService.listDocuments(req.params.storeId, req.params.motoboyId, req.auth?.sub || '');
      return res.json(documents);
    } catch (error) {
      return handleControllerError(error, res);
    }
  }

  /**
   * Approves a motoboy document.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  static async approveDocument(req: Request, res: Response) {
    try {
      const document = await motoboyService.reviewDocument(
        req.params.storeId,
        req.params.motoboyId,
        req.params.documentId,
        req.auth?.sub || '',
        'APPROVED'
      );
      return res.json(document);
    } catch (error) {
      return handleControllerError(error, res);
    }
  }

  /**
   * Rejects a motoboy document.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  static async rejectDocument(req: Request, res: Response) {
    try {
      const document = await motoboyService.reviewDocument(
        req.params.storeId,
        req.params.motoboyId,
        req.params.documentId,
        req.auth?.sub || '',
        'REJECTED'
      );
      return res.json(document);
    } catch (error) {
      return handleControllerError(error, res);
    }
  }

  /**
   * Accepts order for delivery.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  static async acceptOrder(req: Request, res: Response) {
    try {
      const motoboy = await motoboyService.getActiveMotoboyByUserId(req.auth?.sub || '');
      const result = await motoboyOrderService.acceptOrder(req.params.orderId, motoboy);
      return res.json(result);
    } catch (error: any) {
      log.warn('Motoboy accept order failed', { error });
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Confirms payment.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  static async confirmPayment(req: Request, res: Response) {
    try {
      const motoboy = await motoboyService.getActiveMotoboyByUserId(req.auth?.sub || '');
      const order = await motoboyOrderService.confirmPayment(
        req.params.orderId,
        motoboy,
        req.body?.cashTendered ?? null
      );
      return res.json(order);
    } catch (error: any) {
      log.warn('Motoboy confirm payment failed', { error });
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Marks order delivered.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  static async markDelivered(req: Request, res: Response) {
    try {
      const motoboy = await motoboyService.getActiveMotoboyByUserId(req.auth?.sub || '');
      const order = await motoboyOrderService.markDelivered(req.params.orderId, motoboy);
      return res.json(order);
    } catch (error: any) {
      log.warn('Motoboy delivered failed', { error });
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Finishes order.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  static async finishOrder(req: Request, res: Response) {
    try {
      const motoboy = await motoboyService.getActiveMotoboyByUserId(req.auth?.sub || '');
      const order = await motoboyOrderService.finishOrder(req.params.orderId, motoboy);
      return res.json(order);
    } catch (error: any) {
      log.warn('Motoboy finish order failed', { error });
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Creates motoboy profile for store.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  static async createForStore(req: Request, res: Response) {
    try {
      const motoboy = await motoboyService.createProfile(req.params.storeId, req.auth?.sub || '', {
        userId: req.body?.userId,
        email: req.body?.email,
      });
      return res.status(201).json(motoboy);
    } catch (error: any) {
      log.warn('Motoboy create failed', { error });
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Links motoboy to store.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  static async linkStore(req: Request, res: Response) {
    try {
      const link = await motoboyService.linkStore(req.params.storeId, req.params.motoboyId, req.auth?.sub || '');
      return res.json(link);
    } catch (error: any) {
      log.warn('Motoboy link store failed', { error });
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Unlinks motoboy from store.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  static async unlinkStore(req: Request, res: Response) {
    try {
      const link = await motoboyService.unlinkStore(req.params.storeId, req.params.motoboyId, req.auth?.sub || '');
      return res.json(link);
    } catch (error: any) {
      log.warn('Motoboy unlink store failed', { error });
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Approves motoboy.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  static async approve(req: Request, res: Response) {
    try {
      const motoboy = await motoboyService.approveMotoboy(req.params.storeId, req.params.motoboyId, req.auth?.sub || '');
      return res.json(motoboy);
    } catch (error: any) {
      log.warn('Motoboy approve failed', { error });
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Suspends motoboy.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  static async suspend(req: Request, res: Response) {
    try {
      const motoboy = await motoboyService.suspendMotoboy(req.params.storeId, req.params.motoboyId, req.auth?.sub || '');
      return res.json(motoboy);
    } catch (error: any) {
      log.warn('Motoboy suspend failed', { error });
      return respondWithError(req, res, error, 400);
    }
  }
}
