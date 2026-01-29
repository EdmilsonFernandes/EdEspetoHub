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
   * Lists motoboy delivery history.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  static async listHistory(req: Request, res: Response) {
    try {
      const motoboy = await motoboyService.getActiveMotoboyByUserId(req.auth?.sub || '');
      const days = Number(req.query?.days || 7);
      const orders = await motoboyOrderService.listHistory(motoboy, Number.isFinite(days) ? days : 7);
      return res.json(orders);
    } catch (error: any) {
      log.warn('Motoboy history failed', { error });
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Lists store requests for motoboy.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  static async listStoreRequests(req: Request, res: Response) {
    try {
      const motoboy = await motoboyService.getOrCreateMotoboyByUserId(req.auth?.sub || '');
      const requests = await motoboyService.listStoreRequests(motoboy);
      return res.json(
        requests.map((request) => ({
          id: request.id,
          storeId: request.storeId,
          status: request.status,
          createdAt: request.createdAt,
          store: request.store
            ? { id: request.store.id, name: request.store.name, slug: request.store.slug }
            : null,
        }))
      );
    } catch (error: any) {
      log.warn('Motoboy store requests failed', { error });
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Creates store requests for motoboy.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  static async createStoreRequest(req: Request, res: Response) {
    try {
      const motoboy = await motoboyService.getOrCreateMotoboyByUserId(req.auth?.sub || '');
      const storeIds = req.body?.storeIds || [];
      const result = await motoboyService.createStoreRequests(motoboy, storeIds);
      return res.status(201).json(result);
    } catch (error: any) {
      log.warn('Motoboy create store request failed', { error });
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
      return respondWithError(req, res, error, 400);
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
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Lists documents for motoboy itself.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  static async listOwnDocuments(req: Request, res: Response) {
    try {
      const motoboy = await motoboyService.getMotoboyByUserId(req.auth?.sub || '');
      const documents = await motoboyService.listOwnDocuments(motoboy);
      return res.json(documents);
    } catch (error) {
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Gets motoboy profile.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  static async getProfile(req: Request, res: Response) {
    try {
      const motoboy = await motoboyService.getMotoboyByUserId(req.auth?.sub || '');
      return res.json(motoboy);
    } catch (error) {
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Updates motoboy profile.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  static async updateProfile(req: Request, res: Response) {
    try {
      const motoboy = await motoboyService.getMotoboyByUserId(req.auth?.sub || '');
      const updated = await motoboyService.updateProfile(motoboy, req.body || {});
      return res.json(updated);
    } catch (error) {
      return respondWithError(req, res, error, 400);
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
      return respondWithError(req, res, error, 400);
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
      return respondWithError(req, res, error, 400);
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
      return respondWithError(req, res, error, 400);
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

  /**
   * Lists store requests for a store owner.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  static async listStoreRequestsForStore(req: Request, res: Response) {
    try {
      const requests = await motoboyService.listRequestsForStore(req.params.storeId, req.auth?.sub || '');
      return res.json(
        requests.map((request) => ({
          id: request.id,
          storeId: request.storeId,
          status: request.status,
          createdAt: request.createdAt,
          motoboyId: request.motoboyId,
          motoboyStatus: request.motoboy?.status,
          motoboyUser: request.motoboy?.user
            ? {
                id: request.motoboy.user.id,
                fullName: request.motoboy.user.fullName,
                email: request.motoboy.user.email,
                phone: request.motoboy.user.phone,
              }
            : null,
        }))
      );
    } catch (error: any) {
      log.warn('Store request list failed', { error });
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Approves a store request.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  static async approveStoreRequest(req: Request, res: Response) {
    try {
      const request = await motoboyService.reviewStoreRequest(
        req.params.storeId,
        req.params.requestId,
        req.auth?.sub || '',
        'APPROVED'
      );
      return res.json(request);
    } catch (error: any) {
      log.warn('Approve store request failed', { error });
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Rejects a store request.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  static async rejectStoreRequest(req: Request, res: Response) {
    try {
      const request = await motoboyService.reviewStoreRequest(
        req.params.storeId,
        req.params.requestId,
        req.auth?.sub || '',
        'REJECTED'
      );
      return res.json(request);
    } catch (error: any) {
      log.warn('Reject store request failed', { error });
      return respondWithError(req, res, error, 400);
    }
  }
}
