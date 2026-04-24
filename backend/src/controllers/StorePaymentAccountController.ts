import { Request, Response } from 'express';
import { StorePaymentAccountService } from '../services/StorePaymentAccountService';
import { respondWithError } from '../errors/respondWithError';
import { logger } from '../utils/logger';

const service = new StorePaymentAccountService();
const log = logger.child({ scope: 'StorePaymentAccountController' });

const appendGatewayContext = (target?: string | null, status: 'connected' | 'error' = 'connected') => {
  const fallback = '/admin/dashboard?tab=config&section=gateway&paymentAccount=' + status;
  const raw = String(target || '').trim();
  if (!raw) return fallback;

  try {
    const url = new URL(raw);
    url.searchParams.set('tab', 'config');
    url.searchParams.set('section', 'gateway');
    url.searchParams.set('paymentAccount', status);
    return url.toString();
  } catch {
    const [pathname, hash = ''] = raw.split('#');
    const searchIndex = pathname.indexOf('?');
    const basePath = searchIndex >= 0 ? pathname.slice(0, searchIndex) : pathname;
    const params = new URLSearchParams(searchIndex >= 0 ? pathname.slice(searchIndex + 1) : '');
    params.set('tab', 'config');
    params.set('section', 'gateway');
    params.set('paymentAccount', status);
    return `${basePath || '/admin/dashboard'}?${params.toString()}${hash ? `#${hash}` : ''}`;
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
      log.info('Mercado Pago callback success', { storeId: result.storeId, returnTo });
      return res.redirect(returnTo);
    } catch (error: any) {
      log.warn('Mercado Pago callback failed', { error });
      return res.redirect(appendGatewayContext(null, 'error'));
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
