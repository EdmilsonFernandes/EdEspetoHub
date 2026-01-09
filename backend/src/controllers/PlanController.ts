import { Request, Response } from 'express';
import { PlanService } from '../services/PlanService';
import { logger } from '../utils/logger';

const planService = new PlanService();
const log = logger.child({ scope: 'PlanController' });

export class PlanController {
  static async list(_req: Request, res: Response) {
    try {
      log.debug('Plan list request');
      const plans = await planService.listEnabled();
      return res.json(plans);
    } catch (error: any) {
      log.warn('Plan list failed', { error });
      return res.status(400).json({ message: error.message });
    }
  }
}
