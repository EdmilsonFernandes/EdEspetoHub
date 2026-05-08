import { Request, Response } from 'express';
import { StorePaymentAccountService } from '../services/StorePaymentAccountService';
import { MotoboyPaymentAccountService } from '../services/MotoboyPaymentAccountService';
import { MercadoPagoConnectedAccountService } from '../services/MercadoPagoConnectedAccountService';
import { respondWithError } from '../errors/respondWithError';
import { logger } from '../utils/logger';
import { env } from '../config/env';

const service = new StorePaymentAccountService();
const motoboyService = new MotoboyPaymentAccountService();
const sharedService = new MercadoPagoConnectedAccountService();
const log = logger.child({ scope: 'StorePaymentAccountController' });

const appBaseUrl = () => env.appUrl.replace(/\/$/, '').replace('https://www.', 'https://');

const appendGatewayContext = (target?: string | null, status: 'connected' | 'error' = 'connected') => {
  const fallback = `${appBaseUrl()}/admin/dashboard?tab=gateway&paymentAccount=${status}`;
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

const appendMotoboyContext = (target?: string | null, status: 'connected' | 'error' = 'connected') => {
  const fallback = `${appBaseUrl()}/motoboy/profile?paymentAccount=${status}`;
  const raw = String(target || '').trim();
  if (!raw) return fallback;

  try {
    const url = new URL(raw);
    url.hostname = url.hostname.replace(/^www\./, '');
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
      const code = String(req.query?.code || '');
      const state = String(req.query?.state || '');
      const parsedState = sharedService.parseState(state);
      if (parsedState.ownerType === 'MOTOBOY') {
        const result = await motoboyService.handleCallback(code, state);
        const returnTo = appendMotoboyContext(result.returnTo, 'connected');
        log.info('Mercado Pago callback success — redirecting motoboy', { motoboyId: result.motoboyId, returnTo });
        return res.redirect(returnTo);
      }

      const result = await service.handleCallback(code, state);
      const returnTo = appendGatewayContext(result.returnTo, 'connected');
      log.info('Mercado Pago callback success — redirecting store', { storeId: result.storeId, returnTo });
      return res.redirect(returnTo);
    } catch (error: any) {
      const state = String(req.query?.state || '');
      let returnTo = appendGatewayContext(null, 'error');
      try {
        const parsedState = sharedService.parseState(state);
        returnTo =
          parsedState.ownerType === 'MOTOBOY'
            ? appendMotoboyContext(parsedState.returnTo, 'error')
            : appendGatewayContext(parsedState.returnTo, 'error');
      } catch {
        // keep store fallback
      }
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
