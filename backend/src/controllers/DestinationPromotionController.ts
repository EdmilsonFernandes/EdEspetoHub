import { Request, Response } from 'express';
import { respondWithError } from '../errors/respondWithError';
import { DestinationPromotionService } from '../services/DestinationPromotionService';
import { logger } from '../utils/logger';

const service = new DestinationPromotionService();
const log = logger.child({ scope: 'DestinationPromotionController' });

/**
 * Promoções pagas de destaque de destino/chalé (pousada paga para ser destacada).
 * Espelha FeaturedProductController. Partner auth => req.auth.sub é a conta do parceiro.
 */
export class DestinationPromotionController {
  static async getPricing(req: Request, res: Response) {
    try {
      const payload = await service.getPricingSummary();
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async create(req: Request, res: Response) {
    try {
      if (!req.auth?.sub) throw new Error('AUTH-001');
      const payload = await service.createPromotion(req.body || {}, req.auth.sub);
      return res.status(201).json(payload);
    } catch (error: any) {
      log.warn('Destination promotion create failed', { partnerId: req.auth?.sub, error });
      return respondWithError(req, res, error, 400);
    }
  }

  static async listMine(req: Request, res: Response) {
    try {
      if (!req.auth?.sub) throw new Error('AUTH-001');
      const payload = await service.listByPartner(req.auth.sub);
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async refreshPayment(req: Request, res: Response) {
    try {
      if (!req.auth?.sub) throw new Error('AUTH-001');
      const payload = await service.refreshPaymentStatusByPartner(req.auth.sub, req.params.id);
      return res.json(payload);
    } catch (error: any) {
      log.warn('Destination promotion payment refresh failed', { id: req.params.id, error });
      return respondWithError(req, res, error, 400);
    }
  }

  static async cancel(req: Request, res: Response) {
    try {
      if (!req.auth?.sub) throw new Error('AUTH-001');
      const payload = await service.cancelByPartner(req.auth.sub, req.params.id);
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async listForAdmin(req: Request, res: Response) {
    try {
      const payload = await service.listForAdmin({
        status: String(req.query?.status || ''),
        limit: Number(req.query?.limit || 100),
      });
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async reviewByAdmin(req: Request, res: Response) {
    try {
      const payload = await service.reviewByAdmin(req.params.id, req.auth?.sub, req.body || {});
      return res.json(payload);
    } catch (error: any) {
      log.warn('Destination promotion review failed', { id: req.params.id, error });
      return respondWithError(req, res, error, 400);
    }
  }
}
