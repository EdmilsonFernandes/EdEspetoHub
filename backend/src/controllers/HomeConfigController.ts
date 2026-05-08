import { Request, Response } from 'express';
import { HomeConfigService } from '../services/HomeConfigService';
import { respondWithError } from '../errors/respondWithError';

const homeConfigService = new HomeConfigService();

export class HomeConfigController {
  static async getPublic(req: Request, res: Response) {
    try {
      const config = await homeConfigService.getConfig();
      return res.json(config);
    } catch (error) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async getAdmin(req: Request, res: Response) {
    try {
      const config = await homeConfigService.getConfig();
      return res.json(config);
    } catch (error) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async saveAdmin(req: Request, res: Response) {
    try {
      const config = await homeConfigService.saveConfig(req.body || {});
      return res.json(config);
    } catch (error) {
      return respondWithError(req, res, error, 400);
    }
  }
}
