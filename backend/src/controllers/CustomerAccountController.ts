import { Request, Response } from 'express';
import { CustomerAccountService } from '../services/CustomerAccountService';
import { respondWithError } from '../errors/respondWithError';
import { logger } from '../utils/logger';
import { AppError } from '../errors/AppError';

const service = new CustomerAccountService();
const log = logger.child({ scope: 'CustomerAccountController' });

export class CustomerAccountController {
  static async register(req: Request, res: Response) {
    try {
      const result = await service.register(req.body || {});
      return res.status(201).json(result);
    } catch (error: any) {
      log.warn('Customer register failed', { error });
      return respondWithError(req, res, error, 400);
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const result = await service.login(req.body || {});
      return res.json(result);
    } catch (error: any) {
      log.warn('Customer login failed', { error });
      return respondWithError(req, res, error, 401);
    }
  }

  static async me(req: Request, res: Response) {
    try {
      if (!req.auth?.sub) throw new AppError('AUTH-001', 401);
      const user = await service.me(req.auth.sub);
      return res.json(user);
    } catch (error: any) {
      return respondWithError(req, res, error, 401);
    }
  }

  static async updateMe(req: Request, res: Response) {
    try {
      if (!req.auth?.sub) throw new AppError('AUTH-001', 401);
      const user = await service.updateMe(req.auth.sub, req.body || {});
      return res.json(user);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

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

  static async listAddresses(req: Request, res: Response) {
    try {
      if (!req.auth?.sub) throw new AppError('AUTH-001', 401);
      const rows = await service.listAddresses(req.auth.sub);
      return res.json(rows);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async createAddress(req: Request, res: Response) {
    try {
      if (!req.auth?.sub) throw new AppError('AUTH-001', 401);
      const row = await service.createAddress(req.auth.sub, req.body || {});
      return res.status(201).json(row);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async updateAddress(req: Request, res: Response) {
    try {
      if (!req.auth?.sub) throw new AppError('AUTH-001', 401);
      const row = await service.updateAddress(req.auth.sub, req.params.addressId, req.body || {});
      return res.json(row);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async setDefaultAddress(req: Request, res: Response) {
    try {
      if (!req.auth?.sub) throw new AppError('AUTH-001', 401);
      const row = await service.setDefaultAddress(req.auth.sub, req.params.addressId);
      return res.json(row);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async deleteAddress(req: Request, res: Response) {
    try {
      if (!req.auth?.sub) throw new AppError('AUTH-001', 401);
      const result = await service.deleteAddress(req.auth.sub, req.params.addressId);
      return res.json(result);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async listOrders(req: Request, res: Response) {
    try {
      if (!req.auth?.sub) throw new AppError('AUTH-001', 401);
      const rows = await service.listOrders(req.auth.sub);
      return res.json(rows);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }
}

