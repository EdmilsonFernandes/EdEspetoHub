import { Request, Response } from 'express';
import { HomeConfigService } from '../services/HomeConfigService';
import { cacheService } from '../services/CacheService';
import { respondWithError } from '../errors/respondWithError';

const homeConfigService = new HomeConfigService();

export class HomeConfigController {
  static async getPublic(req: Request, res: Response) {
    try {
      const cacheKey = 'config:home';
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }
      const config = await homeConfigService.getConfig();
      await cacheService.set(cacheKey, config, 300);
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
      await cacheService.del('config:home');
      return res.json(config);
    } catch (error) {
      return respondWithError(req, res, error, 400);
    }
  }
}
