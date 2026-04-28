import { Request, Response } from 'express';
import { PromoPushService } from '../services/PromoPushService';
import { respondWithError } from '../errors/respondWithError';

const service = new PromoPushService();

export class PromoPushController {
  static async create(req: Request, res: Response) {
    try {
      const result = await service.create(req.params.storeId, req.auth?.storeId, req.body);
      return res.status(201).json(result);
    } catch (err: any) {
      return respondWithError(req, res, err, 400);
    }
  }

  static async listByStore(req: Request, res: Response) {
    try {
      const result = await service.listByStore(req.params.storeId, req.auth?.storeId);
      return res.json(result);
    } catch (err: any) {
      return respondWithError(req, res, err, 400);
    }
  }

  static async refreshPayment(req: Request, res: Response) {
    try {
      const result = await service.refreshPayment(req.params.pushId, req.params.storeId, req.auth?.storeId);
      return res.json(result);
    } catch (err: any) {
      return respondWithError(req, res, err, 400);
    }
  }

  static async cancel(req: Request, res: Response) {
    try {
      const result = await service.cancel(req.params.pushId, req.params.storeId, req.auth?.storeId);
      return res.json(result);
    } catch (err: any) {
      return respondWithError(req, res, err, 400);
    }
  }

  static async listHistory(req: Request, res: Response) {
    try {
      const result = await service.listHistory();
      return res.json(result);
    } catch (err: any) {
      return respondWithError(req, res, err, 400);
    }
  }

  static async listPending(req: Request, res: Response) {
    try {
      const result = await service.listPending();
      return res.json(result);
    } catch (err: any) {
      return respondWithError(req, res, err, 400);
    }
  }

  static async approve(req: Request, res: Response) {
    try {
      const result = await service.approve(req.params.pushId);
      return res.json(result);
    } catch (err: any) {
      return respondWithError(req, res, err, 400);
    }
  }

  static async reject(req: Request, res: Response) {
    try {
      const result = await service.reject(req.params.pushId, String(req.body?.reason || ''));
      return res.json(result);
    } catch (err: any) {
      return respondWithError(req, res, err, 400);
    }
  }
}
