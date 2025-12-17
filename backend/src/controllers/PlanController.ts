import { Request, Response } from 'express';
import { PlanService } from '../services/PlanService';

const planService = new PlanService();

export class PlanController {
  static async list(_req: Request, res: Response) {
    try {
      const plans = await planService.listEnabled();
      return res.json(plans);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }
}
