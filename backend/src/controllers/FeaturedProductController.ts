import { Request, Response } from 'express';
import { respondWithError } from '../errors/respondWithError';
import { FeaturedProductService } from '../services/FeaturedProductService';
import { logger } from '../utils/logger';

const service = new FeaturedProductService();
const log = logger.child({ scope: 'FeaturedProductController' });

/**
 * Handles featured product request operations for store/admin/public flows.
 *
 * @author Edmilson Lopes
 */
export class FeaturedProductController {
  /**
   * Returns pricing and slot summary for featured products.
   *
   * @author Edmilson Lopes
   */
  static async getStorePricing(req: Request, res: Response) {
    try {
      if (req.auth?.storeId && req.auth.storeId !== req.params.storeId) {
        return res.status(403).json({ code: 'AUTH-003', message: 'Acesso negado para esta loja.' });
      }
      const payload = await service.getStorePricingSummary();
      return res.json(payload);
    } catch (error: any) {
      log.warn('Featured pricing load failed', {
        storeId: req.params.storeId,
        userId: req.auth?.sub,
        error,
      });
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Creates a featured product request for a store.
   *
   * @author Edmilson Lopes
   */
  static async createStoreRequest(req: Request, res: Response) {
    try {
      const payload = await service.createStoreRequest(
        req.params.storeId,
        req.auth?.storeId,
        req.auth?.sub,
        req.body || {}
      );
      return res.status(201).json(payload);
    } catch (error: any) {
      log.warn('Featured request create failed', {
        storeId: req.params.storeId,
        userId: req.auth?.sub,
        error,
      });
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Lists featured product requests for a store.
   *
   * @author Edmilson Lopes
   */
  static async listByStore(req: Request, res: Response) {
    try {
      const payload = await service.listByStore(req.params.storeId, req.auth?.storeId);
      return res.json(payload);
    } catch (error: any) {
      log.warn('Featured request list by store failed', {
        storeId: req.params.storeId,
        userId: req.auth?.sub,
        error,
      });
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Cancels a featured product request on store scope.
   *
   * @author Edmilson Lopes
   */
  static async cancelByStore(req: Request, res: Response) {
    try {
      const payload = await service.cancelByStore(
        req.params.storeId,
        req.params.requestId,
        req.auth?.storeId
      );
      return res.json(payload);
    } catch (error: any) {
      log.warn('Featured request cancel by store failed', {
        storeId: req.params.storeId,
        requestId: req.params.requestId,
        userId: req.auth?.sub,
        error,
      });
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Refreshes payment status for a featured request on store scope.
   *
   * @author Edmilson Lopes
   */
  static async refreshPaymentByStore(req: Request, res: Response) {
    try {
      const payload = await service.refreshPaymentStatusByStore(
        req.params.storeId,
        req.params.requestId,
        req.auth?.storeId
      );
      return res.json(payload);
    } catch (error: any) {
      log.warn('Featured request payment refresh failed', {
        storeId: req.params.storeId,
        requestId: req.params.requestId,
        userId: req.auth?.sub,
        error,
      });
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Lists featured product requests for platform admin review.
   *
   * @author Edmilson Lopes
   */
  static async listForAdmin(req: Request, res: Response) {
    try {
      const payload = await service.listForAdmin({
        status: String(req.query?.status || ''),
        storeId: String(req.query?.storeId || ''),
        limit: Number(req.query?.limit || 100),
      });
      return res.json(payload);
    } catch (error: any) {
      log.warn('Featured request list for admin failed', {
        userId: req.auth?.sub,
        error,
      });
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Reviews a featured product request as platform admin.
   *
   * @author Edmilson Lopes
   */
  static async reviewByAdmin(req: Request, res: Response) {
    try {
      const payload = await service.reviewByAdmin(req.params.requestId, req.auth?.sub, req.body || {});
      return res.json(payload);
    } catch (error: any) {
      log.warn('Featured request review failed', {
        requestId: req.params.requestId,
        userId: req.auth?.sub,
        error,
      });
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Lists active public featured products for hub display.
   *
   * @author Edmilson Lopes
   */
  static async listPublic(req: Request, res: Response) {
    try {
      const payload = await service.listActivePublic(Number(req.query?.limit || 18));
      return res.json(payload);
    } catch (error: any) {
      log.warn('Featured request public list failed', { error });
      return respondWithError(req, res, error, 400);
    }
  }
}
