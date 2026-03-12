import { Request, Response } from 'express';
import { respondWithError } from '../errors/respondWithError';
import { StoreUserService } from '../services/StoreUserService';
import { logger } from '../utils/logger';

const service = new StoreUserService();
const log = logger.child({ scope: 'StoreUserController' });

export class StoreUserController {
  static async list(req: Request, res: Response) {
    try {
      const list = await service.listByStore(req.params.storeId, req.auth?.storeId);
      return res.json(list);
    } catch (error: any) {
      log.warn('Store users list failed', { storeId: req.params.storeId, error });
      return respondWithError(req, res, error, 400);
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const created = await service.createForStore(req.params.storeId, req.body || {}, req.auth?.storeId);
      return res.status(201).json(created);
    } catch (error: any) {
      log.warn('Store users create failed', { storeId: req.params.storeId, error });
      return respondWithError(req, res, error, 400);
    }
  }

  static async updatePassword(req: Request, res: Response) {
    try {
      const result = await service.updatePasswordForStoreUser(
        req.params.storeId,
        req.params.userId,
        req.body || {},
        req.auth?.storeId
      );
      return res.json(result);
    } catch (error: any) {
      log.warn('Store user password update failed', {
        storeId: req.params.storeId,
        userId: req.params.userId,
        error,
      });
      return respondWithError(req, res, error, 400);
    }
  }
}
