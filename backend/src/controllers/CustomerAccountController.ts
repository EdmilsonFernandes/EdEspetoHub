import { Request, Response } from 'express';
import { CustomerAccountService } from '../services/CustomerAccountService';
import { respondWithError } from '../errors/respondWithError';
import { logger } from '../utils/logger';
import { AppError } from '../errors/AppError';

const service = new CustomerAccountService();
const log = logger.child({ scope: 'CustomerAccountController' });

export class CustomerAccountController {
    /**
   * Creates resources for register.
   *
   * @author Edmilson Lopes
   */
static async register(req: Request, res: Response) {
    try {
      const result = await service.register(req.body || {});
      return res.status(201).json(result);
    } catch (error: any) {
      log.warn('Customer register failed', { error });
      return respondWithError(req, res, error, 400);
    }
  }

    /**
   * Executes login business logic.
   *
   * @author Edmilson Lopes
   */
static async login(req: Request, res: Response) {
    try {
      const result = await service.login(req.body || {});
      return res.json(result);
    } catch (error: any) {
      log.warn('Customer login failed', { error });
      return respondWithError(req, res, error, 401);
    }
  }

    /**
   * Executes me business logic.
   *
   * @author Edmilson Lopes
   */
static async me(req: Request, res: Response) {
    try {
      if (!req.auth?.sub) throw new AppError('AUTH-001', 401);
      const user = await service.me(req.auth.sub);
      return res.json(user);
    } catch (error: any) {
      return respondWithError(req, res, error, 401);
    }
  }

    /**
   * Updates resources for update me.
   *
   * @author Edmilson Lopes
   */
static async updateMe(req: Request, res: Response) {
    try {
      if (!req.auth?.sub) throw new AppError('AUTH-001', 401);
      const user = await service.updateMe(req.auth.sub, req.body || {});
      return res.json(user);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

    /**
   * Executes change password business logic.
   *
   * @author Edmilson Lopes
   */
static async changePassword(req: Request, res: Response) {
    try {
      if (!req.auth?.sub) throw new AppError('AUTH-001', 401);
      const currentPassword = String(req.body?.currentPassword || '');
      const newPassword = String(req.body?.newPassword || '');
      const result = await service.changePassword(req.auth.sub, currentPassword, newPassword);
      return res.json(result);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

    /**
   * Lists records for list addresses.
   *
   * @author Edmilson Lopes
   */
static async listAddresses(req: Request, res: Response) {
    try {
      if (!req.auth?.sub) throw new AppError('AUTH-001', 401);
      const rows = await service.listAddresses(req.auth.sub);
      return res.json(rows);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

    /**
   * Creates resources for create address.
   *
   * @author Edmilson Lopes
   */
static async createAddress(req: Request, res: Response) {
    try {
      if (!req.auth?.sub) throw new AppError('AUTH-001', 401);
      const row = await service.createAddress(req.auth.sub, req.body || {});
      return res.status(201).json(row);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

    /**
   * Updates resources for update address.
   *
   * @author Edmilson Lopes
   */
static async updateAddress(req: Request, res: Response) {
    try {
      if (!req.auth?.sub) throw new AppError('AUTH-001', 401);
      const row = await service.updateAddress(req.auth.sub, req.params.addressId, req.body || {});
      return res.json(row);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

    /**
   * Sets state or configuration for set default address.
   *
   * @author Edmilson Lopes
   */
static async setDefaultAddress(req: Request, res: Response) {
    try {
      if (!req.auth?.sub) throw new AppError('AUTH-001', 401);
      const row = await service.setDefaultAddress(req.auth.sub, req.params.addressId);
      return res.json(row);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

    /**
   * Removes resources for delete address.
   *
   * @author Edmilson Lopes
   */
static async deleteAddress(req: Request, res: Response) {
    try {
      if (!req.auth?.sub) throw new AppError('AUTH-001', 401);
      const result = await service.deleteAddress(req.auth.sub, req.params.addressId);
      return res.json(result);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

    /**
   * Lists records for list orders.
   *
   * @author Edmilson Lopes
   */
static async listOrders(req: Request, res: Response) {
    try {
      if (!req.auth?.sub) throw new AppError('AUTH-001', 401);
      const rows = await service.listOrders(req.auth.sub);
      return res.json(rows);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

    /**
   * Registers customer mobile push token.
   *
   * @author Edmilson Lopes
   */
static async registerPushToken(req: Request, res: Response) {
    try {
      if (!req.auth?.sub) throw new AppError('AUTH-001', 401);
      const result = await service.registerPushToken(req.auth.sub, req.body || {});
      return res.json(result);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

    /**
   * Unregisters customer mobile push token.
   *
   * @author Edmilson Lopes
   */
static async unregisterPushToken(req: Request, res: Response) {
    try {
      if (!req.auth?.sub) throw new AppError('AUTH-001', 401);
      const result = await service.unregisterPushToken(req.auth.sub, req.body || {});
      return res.json(result);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Registers guest mobile push token without authenticated customer account.
   *
   * @author Edmilson Lopes
   */
  static async registerGuestPushToken(req: Request, res: Response) {
    try {
      const guestId = String(req.body?.guestId || '').trim();
      if (!guestId) throw new AppError('GEN-002', 400, { message: 'guestId é obrigatório.' });
      const result = await service.registerGuestPushToken(guestId, req.body || {});
      return res.json(result);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  /**
   * Unregisters guest mobile push token without authenticated customer account.
   *
   * @author Edmilson Lopes
   */
  static async unregisterGuestPushToken(req: Request, res: Response) {
    try {
      const guestId = String(req.body?.guestId || '').trim();
      if (!guestId) throw new AppError('GEN-002', 400, { message: 'guestId é obrigatório.' });
      const result = await service.unregisterGuestPushToken(guestId, req.body || {});
      return res.json(result);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }
}
