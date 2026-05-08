import { Request, Response } from 'express';
import { respondWithError } from '../errors/respondWithError';
import { logger } from '../utils/logger';
import { MotoboyService } from '../services/MotoboyService';
import { MotoboyPaymentAccountService } from '../services/MotoboyPaymentAccountService';

const motoboyService = new MotoboyService();
const service = new MotoboyPaymentAccountService();
const log = logger.child({ scope: 'MotoboyPaymentAccountController' });

export class MotoboyPaymentAccountController {
  static async getMercadoPagoStatus(req: Request, res: Response) {
    try {
      const motoboy = await motoboyService.getMotoboyByUserId(req.auth?.sub || '');
      const result = await service.getStatus(motoboy.id);
      return res.json(result);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async createMercadoPagoConnectUrl(req: Request, res: Response) {
    try {
      const motoboy = await motoboyService.getMotoboyByUserId(req.auth?.sub || '');
      const result = await service.createConnectUrl(
        motoboy.id,
        req.body?.returnTo || req.query?.returnTo
      );
      return res.json(result);
    } catch (error: any) {
      log.warn('Motoboy Mercado Pago connect URL failed', { error });
      return respondWithError(req, res, error, 400);
    }
  }

  static async disconnectMercadoPago(req: Request, res: Response) {
    try {
      const motoboy = await motoboyService.getMotoboyByUserId(req.auth?.sub || '');
      const result = await service.disconnect(motoboy.id);
      return res.json(result);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }
}
