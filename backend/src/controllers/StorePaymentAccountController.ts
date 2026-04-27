import { Request, Response } from 'express';
import { StorePaymentAccountService } from '../services/StorePaymentAccountService';
import { respondWithError } from '../errors/respondWithError';
import { logger } from '../utils/logger';

const service = new StorePaymentAccountService();
const log = logger.child({ scope: 'StorePaymentAccountController' });

const appendGatewayContext = (target?: string | null, status: 'connected' | 'error' = 'connected') => {
  const fallback = 'https://janocaminho.com.br/admin/dashboard?tab=gateway&paymentAccount=' + status;
  const raw = String(target || '').trim();
  if (!raw) return fallback;

  try {
    const url = new URL(raw);
    // Forçar sempre non-www
    url.hostname = url.hostname.replace(/^www\./, '');
    url.searchParams.set('tab', 'gateway');
    url.searchParams.delete('section');
    url.searchParams.set('paymentAccount', status);
    return url.toString();
  } catch {
    return fallback;
  }
};

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
      const returnTo = appendGatewayContext(result.returnTo, 'connected');
      log.info('Mercado Pago callback success — redirecting', { storeId: result.storeId, returnTo });
      return res.redirect(returnTo);
    } catch (error: any) {
      const returnTo = appendGatewayContext(null, 'error');
      log.warn('Mercado Pago callback failed — redirecting to error', { error: error?.message, returnTo });
      return res.redirect(returnTo);
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
