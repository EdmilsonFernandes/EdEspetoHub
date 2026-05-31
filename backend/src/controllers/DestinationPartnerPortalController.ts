import { Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { respondWithError } from '../errors/respondWithError';
import { DestinationPartnerPortalService } from '../services/DestinationPartnerPortalService';

const partnerPortalService = new DestinationPartnerPortalService();

const requestMeta = (req: Request) => ({
  ipAddress: req.ip || null,
  userAgent: String(req.headers['user-agent'] || '') || null,
});

export class DestinationPartnerPortalController {
  static async login(req: Request, res: Response) {
    try {
      const payload = await partnerPortalService.login(String(req.body?.email || ''), String(req.body?.password || ''));
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async activate(req: Request, res: Response) {
    try {
      const payload = await partnerPortalService.activate(String(req.body?.token || ''), String(req.body?.password || ''));
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async me(req: Request, res: Response) {
    try {
      if (!req.auth?.sub) throw new AppError('AUTH-001', 401);
      const payload = await partnerPortalService.me(req.auth.sub);
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async updateHospitalityPlace(req: Request, res: Response) {
    try {
      if (!req.auth?.sub) throw new AppError('AUTH-001', 401);
      const payload = await partnerPortalService.updateHospitalityPlace(
        req.auth.sub,
        String(req.params.placeId || ''),
        req.body || {},
        requestMeta(req)
      );
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async updateListing(req: Request, res: Response) {
    try {
      if (!req.auth?.sub) throw new AppError('AUTH-001', 401);
      const payload = await partnerPortalService.updateListing(
        req.auth.sub,
        String(req.params.listingId || ''),
        req.body || {},
        requestMeta(req)
      );
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }
}
