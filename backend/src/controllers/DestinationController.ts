import { Request, Response } from 'express';
import { respondWithError } from '../errors/respondWithError';
import { DestinationService } from '../services/DestinationService';

const destinationService = new DestinationService();

export class DestinationController {
  static async listPublic(req: Request, res: Response) {
    try {
      const payload = await destinationService.listPublicDestinations({
        lat: req.query?.lat != null ? String(req.query.lat) : null,
        lng: req.query?.lng != null ? String(req.query.lng) : null,
        city: req.query?.city != null ? String(req.query.city) : null,
        state: req.query?.state != null ? String(req.query.state) : null,
      });
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async getPublicBySlug(req: Request, res: Response) {
    try {
      const payload = await destinationService.getPublicDestinationBySlug(String(req.params.slug || ''));
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async listPublicHospitality(req: Request, res: Response) {
    try {
      const payload = await destinationService.listPublicHospitality(String(req.params.slug || ''));
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async getPublicHospitalityPlace(req: Request, res: Response) {
    try {
      const payload = await destinationService.getPublicHospitalityPlace(
        String(req.params.slug || ''),
        String(req.params.placeSlug || '')
      );
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async createPartnerRequest(req: Request, res: Response) {
    try {
      const payload = await destinationService.createPartnerRequest(req.body || {});
      return res.status(201).json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async adminOverview(req: Request, res: Response) {
    try {
      const payload = await destinationService.adminOverview(req.query || {});
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async adminCatalogSummary(req: Request, res: Response) {
    try {
      const payload = await destinationService.adminCatalogSummary(req.query || {});
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async adminListDestinationPlaces(req: Request, res: Response) {
    try {
      const payload = await destinationService.adminListDestinationPlaces(String(req.params.destinationId || ''), req.query || {});
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async adminListDestinationListings(req: Request, res: Response) {
    try {
      const payload = await destinationService.adminListDestinationListings(String(req.params.destinationId || ''), req.query || {});
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async adminListDestinationBanners(req: Request, res: Response) {
    try {
      const payload = await destinationService.adminListDestinationBanners(String(req.params.destinationId || ''));
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async adminCreateDestination(req: Request, res: Response) {
    try {
      const payload = await destinationService.adminSaveDestination(req.body || {});
      return res.status(201).json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async adminUpdateDestination(req: Request, res: Response) {
    try {
      const payload = await destinationService.adminSaveDestination(req.body || {}, String(req.params.destinationId || ''));
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async adminCreateBanner(req: Request, res: Response) {
    try {
      const payload = await destinationService.adminSaveBanner(req.body || {});
      return res.status(201).json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async adminUpdateBanner(req: Request, res: Response) {
    try {
      const payload = await destinationService.adminSaveBanner(req.body || {}, String(req.params.bannerId || ''));
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async adminCreateHospitalityPlace(req: Request, res: Response) {
    try {
      const payload = await destinationService.adminSaveHospitalityPlace(req.body || {});
      return res.status(201).json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async adminUpdateHospitalityPlace(req: Request, res: Response) {
    try {
      const payload = await destinationService.adminSaveHospitalityPlace(req.body || {}, String(req.params.placeId || ''));
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async adminCreateListing(req: Request, res: Response) {
    try {
      const payload = await destinationService.adminSaveListing(req.body || {});
      return res.status(201).json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async adminUpdateListing(req: Request, res: Response) {
    try {
      const payload = await destinationService.adminSaveListing(req.body || {}, String(req.params.listingId || ''));
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async adminLinkStore(req: Request, res: Response) {
    try {
      const payload = await destinationService.adminLinkStore(String(req.params.placeId || ''), req.body || {});
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async adminReviewPartnerRequest(req: Request, res: Response) {
    try {
      const payload = await destinationService.adminReviewPartnerRequest(
        String(req.params.requestId || ''),
        req.body || {},
        req.auth?.sub
      );
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async adminReviewStoreRequest(req: Request, res: Response) {
    try {
      const payload = await destinationService.adminReviewStoreRequest(
        String(req.params.requestId || ''),
        req.body || {},
        req.auth?.sub
      );
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async listStoreOptions(req: Request, res: Response) {
    try {
      const payload = await destinationService.listStoreDestinationOptions(String(req.params.storeId || req.auth?.storeId || ''));
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async createStoreRequest(req: Request, res: Response) {
    try {
      const payload = await destinationService.createStoreDestinationRequest(String(req.params.storeId || req.auth?.storeId || ''), req.body || {});
      return res.status(201).json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }

  static async removeStoreDestination(req: Request, res: Response) {
    try {
      const payload = await destinationService.removeStoreDestination(
        String(req.params.storeId || req.auth?.storeId || ''),
        String(req.params.placeId || '')
      );
      return res.json(payload);
    } catch (error: any) {
      return respondWithError(req, res, error, 400);
    }
  }
}
