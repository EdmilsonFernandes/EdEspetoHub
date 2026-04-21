import { Request, Response } from 'express';
import { StorePaymentAccountService } from '../services/StorePaymentAccountService';
import { respondWithError } from '../errors/respondWithError';
import { logger } from '../utils/logger';

const service = new StorePaymentAccountService();
const log = logger.child({ scope: 'StorePaymentAccountController' });

export class StorePaymentAccountController {
  static async getMercadoPagoStatus(req: Request, res: Response) {
    try {
      const result = await service.getStatus(req.params.storeId, req.auth?.storeId);
      return res.json(result);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async createMercadoPagoConnectUrl(req: Request, res: Response) {
    try {
      const result = await service.createConnectUrl(
        req.params.storeId,
        req.auth?.storeId,
        req.body?.returnTo || req.query?.returnTo
      );
      return res.json(result);
    } catch (error: any) {
      log.warn('Mercado Pago connect URL failed', { storeId: req.params.storeId, error });
      return respondWithError(req, res, error, 400);
    }
  }

  static async mercadoPagoCallback(req: Request, res: Response) {
    try {
      const result = await service.handleCallback(String(req.query?.code || ''), String(req.query?.state || ''));
      const fallback = '/admin/dashboard?paymentAccount=connected';
      const returnTo = result.returnTo || fallback;
      return res.redirect(returnTo);
    } catch (error: any) {
      log.warn('Mercado Pago callback failed', { error });
      return res.redirect('/admin/dashboard?paymentAccount=error');
    }
  }

  static async disconnectMercadoPago(req: Request, res: Response) {
    try {
      const result = await service.disconnect(req.params.storeId, req.auth?.storeId);
      return res.json(result);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }
}
