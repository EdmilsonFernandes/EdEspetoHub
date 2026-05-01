import { Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { respondWithError } from '../errors/respondWithError';
import { StoreUserService } from '../services/StoreUserService';
import { logger } from '../utils/logger';

const service = new StoreUserService();
const log = logger.child({ scope: 'StoreUserController' });

export class StoreUserController {
    /**
   * Lists records for list.
   *
   * @author Edmilson Lopes
   */
static async list(req: Request, res: Response) {
    try {
      const list = await service.listByStore(req.params.storeId, req.auth?.storeId);
      return res.json(list);
    } catch (error: any) {
      log.warn('Store users list failed', { storeId: req.params.storeId, error });
      return respondWithError(req, res, error, 400);
    }
  }

    /**
   * Creates resources for create.
   *
   * @author Edmilson Lopes
   */
static async create(req: Request, res: Response) {
    try {
      const created = await service.createForStore(req.params.storeId, req.body || {}, req.auth?.storeId);
      return res.status(201).json(created);
    } catch (error: any) {
      log.warn('Store users create failed', { storeId: req.params.storeId, error });
      return respondWithError(req, res, error, 400);
    }
  }

    /**
   * Updates resources for update password.
   *
   * @author Edmilson Lopes
   */
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

    /**
   * Removes resources for remove.
   *
   * @author Edmilson Lopes
   */
static async remove(req: Request, res: Response) {
    try {
      const result = await service.removeForStore(
        req.params.storeId,
        req.params.userId,
        req.auth?.storeId,
        req.auth?.sub
      );
      return res.json(result);
    } catch (error: any) {
      log.warn('Store user remove failed', {
        storeId: req.params.storeId,
        userId: req.params.userId,
        error,
      });
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Registers one mobile push token for the authenticated store staff user.
   *
   * @author Edmilson Lopes
   */
  static async registerPushToken(req: Request, res: Response) {
    try {
      if (!req.auth?.sub) throw new AppError('AUTH-001', 401);
      const result = await service.registerPushToken(
        req.params.storeId,
        req.auth.sub,
        req.body || {},
        req.auth?.storeId
      );
      return res.json(result);
    } catch (error: any) {
      log.warn('Store user register push failed', {
        storeId: req.params.storeId,
        error,
      });
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Unregisters one mobile push token for the authenticated store staff user.
   *
   * @author Edmilson Lopes
   */
  static async unregisterPushToken(req: Request, res: Response) {
    try {
      if (!req.auth?.sub) throw new AppError('AUTH-001', 401);
      const result = await service.unregisterPushToken(
        req.params.storeId,
        req.auth.sub,
        req.body || {},
        req.auth?.storeId
      );
      return res.json(result);
    } catch (error: any) {
      log.warn('Store user unregister push failed', {
        storeId: req.params.storeId,
        error,
      });
      return respondWithError(req, res, error, 400);
    }
  }
}
