/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: MotoboyKycController.ts
 * @Date: 2026-02-10
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { Request, Response } from 'express';
import { respondWithError } from '../errors/respondWithError';
import { MotoboyService } from '../services/MotoboyService';

const motoboyService = new MotoboyService();

export class MotoboyKycController {
    /**
   * Executes audit summary business logic.
   *
   * @author Edmilson Lopes
   */
static async auditSummary(req: Request, res: Response) {
    try {
      const days = Number(req.query?.days || 30);
      const data = await motoboyService.getKycAuditSummary(days);
      return res.json(data);
    } catch (error) {
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Lists motoboys that have documents pending platform (SUPER_ADMIN) review.
   */
  static async listPending(_req: Request, res: Response) {
    try {
      const data = await motoboyService.listPendingKycQueue();
      return res.json(data);
    } catch (error) {
      return respondWithError(_req, res, error, 400);
    }
  }

  /**
   * Lists recent approved/rejected KYC reviews (platform-wide).
   */
  static async listRecentReviews(req: Request, res: Response) {
    try {
      const limit = Number(req.query?.limit || 30);
      const data = await motoboyService.listRecentKycReviews(limit);
      return res.json(data);
    } catch (error) {
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Lists all documents for a motoboy (platform view).
   */
  static async listMotoboyDocuments(req: Request, res: Response) {
    try {
      const motoboyId = String(req.params.motoboyId || '');
      const data = await motoboyService.listAllDocumentsForMotoboy(motoboyId);
      return res.json(data);
    } catch (error) {
      return respondWithError(req, res, error, 400);
    }
  }

    /**
   * Approves workflow step for approve document.
   *
   * @author Edmilson Lopes
   */
static async approveDocument(req: Request, res: Response) {
    try {
      const motoboyId = String(req.params.motoboyId || '');
      const documentId = String(req.params.documentId || '');
      const doc = await motoboyService.platformReviewDocument(
        motoboyId,
        documentId,
        req.auth?.sub || '',
        'APPROVED'
      );
      return res.json(doc);
    } catch (error) {
      return respondWithError(req, res, error, 400);
    }
  }

    /**
   * Rejects workflow step for reject document.
   *
   * @author Edmilson Lopes
   */
static async rejectDocument(req: Request, res: Response) {
    try {
      const motoboyId = String(req.params.motoboyId || '');
      const documentId = String(req.params.documentId || '');
      const reason = req.body?.reason;
      const doc = await motoboyService.platformReviewDocument(
        motoboyId,
        documentId,
        req.auth?.sub || '',
        'REJECTED',
        reason
      );
      return res.json(doc);
    } catch (error) {
      return respondWithError(req, res, error, 400);
    }
  }
}
