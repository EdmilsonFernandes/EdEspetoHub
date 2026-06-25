import { resolvePlanFeatures } from '../config/planFeatures';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { AppError } from '../errors/AppError';
import { DestinationRepository } from '../repositories/DestinationRepository';
import {
  buildDestinationStoreMatchMeta,
  buildDestinationVisitorMatchMeta,
  DestinationLocationContext,
  normalizeDestinationListingCategory,
  normalizeDestinationPartnerType,
  normalizeDestinationSlug,
  normalizeHospitalityPlaceType,
  toNullableNumber,
  toOptionalText,
} from '../utils/destinationHub';
import { normalizeExternalUrl, normalizeInstagramUrl } from '../utils/socialUrl';
import {
  MAX_HOSPITALITY_BANNER_IMAGES,
  mergeHospitalityBannerSlots,
  normalizeHospitalityBannerSlots,
  normalizeHospitalityBannerUrls,
} from '../utils/hospitalityMedia';
import { saveBase64Image } from '../utils/imageStorage';
import { logger } from '../utils/logger';
import {
  buildGeoQuality,
  hasUsableBrazilCoordinatePair,
  isApproximateGeoPrecision,
  sameCoordinatePair,
} from '../utils/geoQuality';
import {
  buildDestinationGeocodeAddress as buildGeoAddressLine,
  buildDestinationGeocodeCandidates,
} from '../utils/destinationGeoAddress';
import { GeoLocationService } from './GeoLocationService';
import { OrderReviewService } from './OrderReviewService';
import { SubscriptionService } from './SubscriptionService';
import { ZipCodeLookupResult, ZipCodeLookupService } from './ZipCodeLookupService';
import {
  DestinationPartnerPortalService,
  RESOURCE_DESTINATION_LISTING,
  RESOURCE_HOSPITALITY_PLACE,
} from './DestinationPartnerPortalService';
import { EmailService } from './EmailService';

type ResolvedDestinationCoordinates = {
  lat: number | null;
  lng: number | null;
  geoSource: string;
  geoPrecision: string;
  geoVerified: boolean;
  geocodedAt: Date | null;
  formattedAddress: string | null;
};

export class DestinationService {
  private repository = new DestinationRepository();
  private userRepository = AppDataSource.getRepository(User);
  private subscriptionService = new SubscriptionService();
  private orderReviewService = new OrderReviewService();
  private geoLocationService = new GeoLocationService();
  private zipCodeLookupService = new ZipCodeLookupService();
  private destinationPartnerPortalService = new DestinationPartnerPortalService();
  private emailService = new EmailService();
  private log = logger.child({ scope: 'DestinationService' });

  private async notifyPartnerRequestByEmail(payload: {
    requestId?: string;
    partnerType: string;
    resourceName: string;
    destinationName?: string | null;
    responsibleName: string;
    responsibleEmail: string;
    responsiblePhone?: string | null;
    city?: string | null;
    state?: string | null;
    message?: string | null;
  }) {
    try {
      await this.emailService.sendDestinationPartnerRequestNotification(payload);
    } catch (error) {
      this.log.error('Destination partner request notification failed', {
        requestId: payload.requestId || null,
        resourceName: payload.resourceName,
        responsibleEmail: payload.responsibleEmail,
        error,
      });
    }
  }


  private async notifyPartnerConfirmationByEmail(payload: {
    partnerType: string;
    resourceName: string | null;
    destinationName?: string | null;
    responsibleName: string;
    responsibleEmail: string;
  }) {
    try {
      await this.emailService.sendDestinationPartnerRequestConfirmation({
        email: payload.responsibleEmail,
        name: payload.responsibleName,
        partnerType: payload.partnerType,
        resourceName: payload.resourceName,
        destinationName: payload.destinationName,
      });
    } catch (error) {
      this.log.error('Destination partner request confirmation failed', {
        resourceName: payload.resourceName,
        responsibleEmail: payload.responsibleEmail,
        error,
      });
    }
  }

  async listPublicDestinations(location?: DestinationLocationContext) {
    const destinations = await this.repository.listActiveDestinations();
    const counts = await Promise.all(
      destinations.map(async (destination) => {
        const [places, listings, banners] = await Promise.all([
          this.repository.listPlacesByDestinationId(destination.id),
          this.repository.listListingsByDestinationId(destination.id),
          this.repository.listBannersByDestinationId(destination.id),
        ]);
        return {
          destination,
          placesCount: places.length,
          listingsCount: listings.length,
          banners,
        };
      })
    );

    return counts
      .map((item) => ({
        ...this.toPublicDestination(item.destination),
        placesCount: item.placesCount,
        listingsCount: item.listingsCount,
        banners: item.banners.map((banner) => this.toPublicBanner(banner)),
        destinationMatch: buildDestinationVisitorMatchMeta(location, item.destination),
      }))
      .sort((left: any, right: any) => {
        const hasLocation = Boolean(
          location?.city ||
          location?.state ||
          (location?.lat !== null && location?.lat !== undefined && String(location.lat).trim()) ||
          (location?.lng !== null && location?.lng !== undefined && String(location.lng).trim())
        );
        if (hasLocation) {
          const rankDiff = Number(left.destinationMatch?.rank ?? 9) - Number(right.destinationMatch?.rank ?? 9);
          if (rankDiff !== 0) return rankDiff;
          const leftDistance = left.destinationMatch?.distanceKm;
          const rightDistance = right.destinationMatch?.distanceKm;
          if (leftDistance != null && rightDistance != null && leftDistance !== rightDistance) {
            return Number(leftDistance) - Number(rightDistance);
          }
        }
        const sortDiff = Number(left.sortOrder || 0) - Number(right.sortOrder || 0);
        if (sortDiff !== 0) return sortDiff;
        return String(left.name || '').localeCompare(String(right.name || ''), 'pt-BR');
      });
  }

  async getPublicDestinationBySlug(slug: string) {
    const destination = await this.repository.findDestinationBySlug(normalizeDestinationSlug(slug));
    if (!destination) throw new AppError('DEST-001', 404);
    const [banners, places, rawListings] = await Promise.all([
      this.repository.listBannersByDestinationId(destination.id),
      this.repository.listPlacesByDestinationId(destination.id),
      this.repository.listListingsByDestinationId(destination.id),
    ]);
    const listings = await this.withListingHospitalityPlaces(rawListings);
    const links = await this.repository.listStoreLinksByPlaceIds(places.map((place) => place.id));
    const linksByPlace = links.reduce((acc, link: any) => {
      const placeId = String(link.hospitalityPlaceId || '');
      if (!acc.has(placeId)) acc.set(placeId, []);
      acc.get(placeId)?.push(link);
      return acc;
    }, new Map<string, any[]>());

    return {
      destination: this.toPublicDestination(destination),
      banners: banners.map((banner) => this.toPublicBanner(banner)),
      hospitalityPlaces: places.map((place) => ({
        ...this.toPublicPlace(place),
        storeCount: (linksByPlace.get(place.id) || []).length,
        featuredStores: (linksByPlace.get(place.id) || []).slice(0, 4).map((link) => this.toPublicStoreLink(link)),
      })),
      listings: listings.map((listing) => this.toPublicListing(listing)),
    };
  }

  async listPublicHospitality(destinationSlug: string) {
    const destination = await this.repository.findDestinationBySlug(normalizeDestinationSlug(destinationSlug));
    if (!destination) throw new AppError('DEST-001', 404);
    const places = await this.repository.listPlacesByDestinationId(destination.id);
    return {
      destination: this.toPublicDestination(destination),
      hospitalityPlaces: places.map((place) => this.toPublicPlace(place)),
    };
  }

  async getPublicHospitalityPlace(destinationSlug: string, placeSlug: string) {
    const destination = await this.repository.findDestinationBySlug(normalizeDestinationSlug(destinationSlug));
    if (!destination) throw new AppError('DEST-001', 404);
    const place = await this.repository.findActivePlaceBySlug(destination.id, normalizeDestinationSlug(placeSlug));
    if (!place) throw new AppError('DEST-002', 404);
    const [links, rawListings] = await Promise.all([
      this.repository.listStoreLinksByPlaceId(place.id),
      this.repository.listListingsByDestinationId(destination.id),
    ]);
    const listings = await this.withListingHospitalityPlaces(rawListings);
    const stores = await this.resolvePublicStoreLinks(links);
    return {
      destination: this.toPublicDestination(destination),
      hospitalityPlace: this.toPublicPlace(place),
      stores,
      listings: listings
        .filter((listing) => this.listingAppliesToHospitalityPlace(listing, place.id))
        .sort((left, right) => this.compareHospitalityListings(left, right, place.id))
        .map((listing) => this.toPublicListing(listing)),
    };
  }

  async createPartnerRequest(payload: any, actorUserId?: string | null) {
    const destinationResolution = await this.resolvePartnerRequestDestination(payload);
    const destination = destinationResolution.destination;
    if (!destination || (!destinationResolution.allowInactive && destination.active === false)) throw new AppError('DEST-001', 404);

    const partnerType = normalizeDestinationPartnerType(payload?.partnerType);
    const name = String(payload?.name || '').trim();
    const responsibleName = String(payload?.responsibleName || '').trim();
    const responsibleEmail = String(payload?.responsibleEmail || '').trim().toLowerCase();
    const responsiblePhone = String(payload?.responsiblePhone || '').trim();
    if (!name || !responsibleName || !responsibleEmail || !responsiblePhone) {
      throw new AppError('DEST-003', 400);
    }

    const requestSource = toOptionalText(payload?.requestSource || payload?.source);
    const requestedClaimedPlaceId = toOptionalText(payload?.claimedHospitalityPlaceId || payload?.placeId);
    const requestedClaimedListingId = toOptionalText(payload?.claimedListingId || payload?.destinationListingId || payload?.listingId);
    let claimedHospitalityPlaceId: string | null = null;
    let claimedListingId: string | null = null;

    if (requestedClaimedPlaceId && partnerType !== 'SERVICE_PROVIDER') {
      const claimedPlace = await this.repository.findPlaceById(requestedClaimedPlaceId);
      if (!claimedPlace || String(claimedPlace.destinationId) !== String(destination.id)) {
        throw new AppError('DEST-002', 404);
      }
      claimedHospitalityPlaceId = claimedPlace.id;
    }

    if (requestedClaimedListingId && partnerType === 'SERVICE_PROVIDER') {
      const claimedListing = await this.repository.findListingById(requestedClaimedListingId);
      if (!claimedListing || String(claimedListing.destinationId) !== String(destination.id)) {
        throw new AppError('DEST-012', 404);
      }
      claimedListingId = claimedListing.id;
    }

    // Decisão explícita de vínculo: só vincula ao login do cliente se o usuário
    // confirmar (linkToAccount). Caso contrário, vira conta separada.
    const linkToAccount = payload?.linkToAccount !== false;
    const effectiveUserId = linkToAccount && actorUserId ? actorUserId : null;

    // Conta separada (sem vínculo): o e-mail do responsável não pode ser de uma
    // conta users já existente — senão gera dois logins com o mesmo e-mail.
    // Nesse caso, a única opção é vincular (ou usar outro e-mail).
    if (!effectiveUserId) {
      const existingUserByEmail = await this.userRepository.findOne({ where: { email: responsibleEmail } });
      if (existingUserByEmail) {
        throw new AppError('DEST-014', 409, {
          message: 'Este e-mail já pertence a uma conta no Já no Caminho. Entre com ele para vincular o chalé, ou use outro e-mail.',
        });
      }
    }

    const existing = await this.repository.findPendingPartnerRequestByEmailAndName(responsibleEmail, name, destination.id);
    if (existing) {
      void this.notifyPartnerRequestByEmail({
        requestId: existing.id,
        partnerType: existing.partnerType || partnerType,
        resourceName: existing.name || name,
        destinationName: destination.name || destination.city || null,
        responsibleName: existing.responsibleName || responsibleName,
        responsibleEmail,
        responsiblePhone: existing.responsiblePhone || responsiblePhone,
        city: existing.city || destination.city || null,
        state: existing.state || destination.state || null,
        message: existing.message || payload?.message || null,
      });
      void this.notifyPartnerConfirmationByEmail({
        partnerType: existing.partnerType || partnerType,
        resourceName: existing.name || name,
        destinationName: destination.name || destination.city || null,
        responsibleName: existing.responsibleName || responsibleName,
        responsibleEmail,
      });
      return this.toPublicPartnerRequest(existing);
    }

    const baseSlug = normalizeDestinationSlug(payload?.slug || name) || 'parceiro';
    const logoUrl = await saveBase64Image(payload?.logoFile, `destination-partner-logo-${baseSlug}`, 'destinations');
    const bannerUrl = await saveBase64Image(payload?.bannerFile, `destination-partner-banner-${baseSlug}`, 'destinations');
    const imageUrl = await saveBase64Image(payload?.imageFile, `destination-partner-image-${baseSlug}`, 'destinations');

    const saved = await this.repository.savePartnerRequest({
      destinationId: destination.id,
      userId: effectiveUserId,
      partnerType,
      placeType: partnerType === 'HOSPITALITY' ? normalizeHospitalityPlaceType(payload?.placeType) : null,
      category: partnerType === 'SERVICE_PROVIDER' ? normalizeDestinationListingCategory(payload?.category) : null,
      name,
      slug: baseSlug,
      description: toOptionalText(payload?.description),
      address: toOptionalText(payload?.address),
      city: toOptionalText(payload?.city) || destination.city || null,
      state: toOptionalText(payload?.state)?.toUpperCase() || destination.state || null,
      zipCode: toOptionalText(payload?.zipCode),
      phone: toOptionalText(payload?.phone),
      whatsapp: toOptionalText(payload?.whatsapp),
      instagramUrl: normalizeInstagramUrl(payload?.instagramUrl),
      websiteUrl: normalizeExternalUrl(payload?.websiteUrl),
      logoUrl: logoUrl || toOptionalText(payload?.logoUrl),
      bannerUrl: bannerUrl || toOptionalText(payload?.bannerUrl),
      imageUrl: imageUrl || toOptionalText(payload?.imageUrl),
      deliveryInstructions: toOptionalText(payload?.deliveryInstructions),
      requestSource,
      claimedHospitalityPlaceId,
      claimedListingId,
      responsibleName,
      responsibleEmail,
      responsiblePhone,
      message: toOptionalText(payload?.message),
      status: 'pending',
    });
    void this.notifyPartnerRequestByEmail({
      requestId: saved.id,
      partnerType,
      resourceName: saved.name || name,
      destinationName: destination.name || destination.city || null,
      responsibleName,
      responsibleEmail,
      responsiblePhone,
      city: saved.city || destination.city || null,
      state: saved.state || destination.state || null,
      message: saved.message || null,
    });
    void this.notifyPartnerConfirmationByEmail({
      partnerType,
      resourceName: saved.name || name,
      destinationName: destination.name || destination.city || null,
      responsibleName,
      responsibleEmail,
    });
    return this.toPublicPartnerRequest({ ...saved, destination });
  }

  async adminOverview(query: any = {}) {
    const lite = query?.lite === true || String(query?.lite || '').toLowerCase() === 'true';
    const [destinations, places, rawListings, partnerRequests, storeRequests, stores] = await Promise.all([
      this.repository.listAllDestinations(),
      this.repository.listAllPlaces(),
      lite ? Promise.resolve([]) : this.repository.listAllListings(),
      this.repository.listPartnerRequests(),
      this.repository.listStoreRequests(),
      this.repository.listAllStoresForAdmin(),
    ]);
    const listings = await this.withListingHospitalityPlaces(rawListings);
    const placeIds = places.map((place) => place.id);
    const allLinks = await this.repository.listStoreLinksByPlaceIds(placeIds, false);
    const linksByPlace = allLinks.reduce((acc, link: any) => {
      const placeId = String(link.hospitalityPlaceId || '');
      if (!acc.has(placeId)) acc.set(placeId, []);
      acc.get(placeId)?.push(link);
      return acc;
    }, new Map<string, any[]>());
    const storeRequestsByPartnerRequest = new Map<string, any[]>();
    const partnerRequestsById = new Map<string, any>();
    for (const request of partnerRequests) {
      const requestId = String(request?.id || '');
      if (!requestId) continue;
      partnerRequestsById.set(requestId, request);
      const linkedRequests = storeRequests.filter((storeRequest: any) =>
        String(storeRequest?.storeId || '') === String(request?.storeId || '') &&
        String(storeRequest?.message || '').includes(requestId)
      );
      if (linkedRequests.length) storeRequestsByPartnerRequest.set(requestId, linkedRequests);
    }

    return {
      destinations: destinations.map((destination) => this.toPublicDestination(destination)),
      places: places.map((place) => ({
        ...this.toPublicPlace(place),
        destination: place.destination ? this.toPublicDestination(place.destination) : null,
        storeLinks: (linksByPlace.get(place.id) || []).map((link) => this.toPublicStoreLink(link)),
      })),
      listings: listings.map((listing) => this.toPublicListing(listing)),
      partnerRequests: partnerRequests.map((request) => this.toPublicPartnerRequest({
        ...request,
        requestedStoreRequests: storeRequestsByPartnerRequest.get(String(request?.id || '')) || [],
      })),
      storeRequests: storeRequests.map((request) => {
        const parentPartnerRequestId = this.listingClaimRequestIdFromStoreRequest(request);
        const parentPartnerRequest = parentPartnerRequestId ? partnerRequestsById.get(parentPartnerRequestId) : null;
        return this.toPublicStoreRequest({
          ...request,
          parentPartnerRequestId: parentPartnerRequest?.id || parentPartnerRequestId || null,
          parentPartnerRequestStatus: parentPartnerRequest?.status || null,
          parentPartnerRequestName: parentPartnerRequest?.name || parentPartnerRequest?.claimedListing?.title || null,
        });
      }),
      stores: stores.map((store: any) => this.toPublicStoreSummary(store)),
    };
  }

  async adminCatalogSummary(query: any = {}) {
    const page = this.toPaginationNumber(query?.page, 1, 1, 9999);
    const pageSize = this.toPaginationNumber(query?.pageSize, 12, 5, 50);
    const status = this.normalizeAdminStatus(query?.status);
    const state = String(query?.state || 'all').trim().toUpperCase();
    const contentType = this.normalizeAdminContentType(query?.contentType || query?.content);
    const listingCategory = String(query?.listingCategory || query?.category || 'all').trim().toUpperCase() || 'ALL';
    const search = String(query?.search || '').trim();

    const [metrics, stateRows, categoryRows, destinationPage] = await Promise.all([
      this.repository.getAdminDashboardMetrics(),
      this.repository.listAdminDestinationStates(),
      this.repository.listAdminListingCategories(status),
      this.repository.listAdminDestinationsPage({
        page,
        pageSize,
        search,
        state,
        status,
        contentType,
        listingCategory,
      }),
    ]);
    const [destinations, total] = destinationPage;
    const destinationIds = destinations.map((destination: any) => destination.id);
    const [placesCounts, listingsCounts] = await Promise.all([
      this.repository.countPlacesByDestinationIds(destinationIds, status),
      this.repository.countListingsByDestinationIds(destinationIds, status, listingCategory),
    ]);

    return {
      metrics,
      states: [
        { id: 'all', label: 'Todas UFs', count: metrics.destinations },
        ...stateRows.map((row: any) => ({
          id: String(row.state || 'UF').toUpperCase().slice(0, 2),
          label: String(row.state || 'UF').toUpperCase().slice(0, 2),
          count: Number(row.count || 0),
        })),
      ],
      categories: [
        { id: 'all', label: 'Todas categorias', count: categoryRows.reduce((total: number, row: any) => total + Number(row.count || 0), 0) },
        ...categoryRows.map((row: any) => {
          const category = String(row.category || 'SERVICO').toUpperCase();
          return {
            id: category,
            label: category,
            count: Number(row.count || 0),
          };
        }),
      ],
      destinations: destinations.map((destination: any) => ({
        ...this.toPublicDestination(destination),
        placesCount: placesCounts.get(destination.id) || 0,
        listingsCount: listingsCounts.get(destination.id) || 0,
      })),
      pagination: this.toPaginationMeta(page, pageSize, total),
      filters: { search, state, status, contentType, listingCategory },
    };
  }

  async adminListDestinationPlaces(destinationId: string, query: any = {}) {
    const destination = await this.repository.findDestinationById(destinationId);
    if (!destination) throw new AppError('DEST-001', 404);
    const page = this.toPaginationNumber(query?.page, 1, 1, 9999);
    const pageSize = this.toPaginationNumber(query?.pageSize, 10, 5, 50);
    const status = this.normalizeAdminStatus(query?.status);
    const search = String(query?.search || '').trim();
    const [places, total] = await this.repository.listAdminPlacesPage(destinationId, { page, pageSize, search, status });
    const links = await this.repository.listStoreLinksByPlaceIds(places.map((place: any) => place.id), false);
    const linksByPlace = links.reduce((acc, link: any) => {
      const placeId = String(link.hospitalityPlaceId || '');
      if (!acc.has(placeId)) acc.set(placeId, []);
      acc.get(placeId)?.push(link);
      return acc;
    }, new Map<string, any[]>());
    return {
      destination: this.toPublicDestination(destination),
      items: places.map((place: any) => ({
        ...this.toPublicPlace(place),
        destination: place.destination ? this.toPublicDestination(place.destination) : this.toPublicDestination(destination),
        storeLinks: (linksByPlace.get(place.id) || []).map((link) => this.toPublicStoreLink(link)),
      })),
      pagination: this.toPaginationMeta(page, pageSize, total),
      filters: { search, status },
    };
  }

  async adminListDestinationListings(destinationId: string, query: any = {}) {
    const destination = await this.repository.findDestinationById(destinationId);
    if (!destination) throw new AppError('DEST-001', 404);
    const page = this.toPaginationNumber(query?.page, 1, 1, 9999);
    const pageSize = this.toPaginationNumber(query?.pageSize, 10, 5, 50);
    const status = this.normalizeAdminStatus(query?.status);
    const search = String(query?.search || '').trim();
    const listingCategory = String(query?.listingCategory || query?.category || 'all').trim().toUpperCase() || 'ALL';
    const [rawListings, total] = await this.repository.listAdminListingsPage(destinationId, {
      page,
      pageSize,
      search,
      status,
      listingCategory,
    });
    const listings = await this.withListingHospitalityPlaces(rawListings);
    return {
      destination: this.toPublicDestination(destination),
      items: listings.map((listing) => this.toPublicListing(listing)),
      pagination: this.toPaginationMeta(page, pageSize, total),
      filters: { search, status, listingCategory },
    };
  }

  async adminListDestinationBanners(destinationId: string) {
    const destination = await this.repository.findDestinationById(destinationId);
    if (!destination) throw new AppError('DEST-001', 404);
    const banners = await this.repository.listBannersByDestinationId(destination.id, false);
    return {
      destination: this.toPublicDestination(destination),
      items: banners.map((banner) => this.toPublicBanner(banner)),
    };
  }

  private normalizeStateCode(value: unknown) {
    const normalized = toOptionalText(value)?.toUpperCase().replace(/[^A-Z]/g, '') || null;
    return normalized ? normalized.slice(0, 2) : null;
  }

  private normalizeListingHospitalityPlaceIds(payload: any, current: any) {
    const hasPlaceIdsInput =
      Object.prototype.hasOwnProperty.call(payload || {}, 'hospitalityPlaceIds') ||
      Object.prototype.hasOwnProperty.call(payload || {}, 'placeIds');
    const hasSinglePlaceInput = Object.prototype.hasOwnProperty.call(payload || {}, 'hospitalityPlaceId');

    if (hasPlaceIdsInput) {
      const raw = Array.isArray(payload?.hospitalityPlaceIds)
        ? payload.hospitalityPlaceIds
        : Array.isArray(payload?.placeIds)
          ? payload.placeIds
          : typeof payload?.hospitalityPlaceIds === 'string'
            ? payload.hospitalityPlaceIds.split(',')
            : typeof payload?.placeIds === 'string'
              ? payload.placeIds.split(',')
              : [];
      return Array.from(new Set(raw.map((item: any) => toOptionalText(item)).filter(Boolean))) as string[];
    }

    if (hasSinglePlaceInput) {
      const placeId = toOptionalText(payload?.hospitalityPlaceId);
      return placeId ? [placeId] : [];
    }

    const currentLinks = Array.isArray(current?.hospitalityPlaceLinks)
      ? current.hospitalityPlaceLinks.map((link: any) => toOptionalText(link?.hospitalityPlaceId)).filter(Boolean)
      : [];
    if (currentLinks.length) return Array.from(new Set(currentLinks)) as string[];
    return current?.hospitalityPlaceId ? [String(current.hospitalityPlaceId)] : [];
  }

  private normalizeListingHospitalityPlaceLinks(payload: any, current: any) {
    const hasLinkInput =
      Object.prototype.hasOwnProperty.call(payload || {}, 'hospitalityPlaceLinks') ||
      Object.prototype.hasOwnProperty.call(payload || {}, 'placeLinks');
    if (hasLinkInput) {
      const rawLinks = Array.isArray(payload?.hospitalityPlaceLinks)
        ? payload.hospitalityPlaceLinks
        : Array.isArray(payload?.placeLinks)
          ? payload.placeLinks
          : [];
      const links = new Map<string, { hospitalityPlaceId: string; sortOrder: number }>();
      rawLinks.forEach((item: any, index: number) => {
        const placeId = typeof item === 'string'
          ? toOptionalText(item)
          : toOptionalText(item?.hospitalityPlaceId || item?.placeId || item?.id);
        if (!placeId || links.has(placeId)) return;
        const sortOrder = Number(typeof item === 'string' ? index : item?.sortOrder ?? index);
        links.set(placeId, {
          hospitalityPlaceId: placeId,
          sortOrder: Number.isFinite(sortOrder) ? sortOrder : index,
        });
      });
      return Array.from(links.values());
    }

    const currentSortByPlace = new Map<string, number>();
    if (Array.isArray(current?.hospitalityPlaceLinks)) {
      current.hospitalityPlaceLinks.forEach((link: any, index: number) => {
        const placeId = toOptionalText(link?.hospitalityPlaceId || link?.hospitalityPlace?.id);
        if (!placeId || currentSortByPlace.has(placeId)) return;
        const sortOrder = Number(link?.sortOrder ?? index);
        currentSortByPlace.set(placeId, Number.isFinite(sortOrder) ? sortOrder : index);
      });
    }

    return this.normalizeListingHospitalityPlaceIds(payload, current).map((hospitalityPlaceId, index) => ({
      hospitalityPlaceId,
      sortOrder: currentSortByPlace.get(hospitalityPlaceId) ?? index,
    }));
  }

  private async assertListingHospitalityPlaces(placeIds: string[], destinationId: string) {
    if (!placeIds.length) return;
    const places = await this.repository.findPlacesByIds(placeIds);
    const foundIds = new Set(places.map((place) => String(place.id)));
    const invalid = placeIds.find((placeId) => !foundIds.has(placeId));
    if (invalid) throw new AppError('DEST-002', 404);
    if (places.some((place) => String(place.destinationId) !== String(destinationId))) {
      throw new AppError('DEST-002', 404);
    }
  }

  private normalizeZipCode(value: unknown) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
    return digits || toOptionalText(value);
  }

  private buildDestinationGeocodeAddress(payload: {
    address?: string | null;
    addressNumber?: string | null;
    district?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
  }) {
    return buildGeoAddressLine(payload);
  }

  private async lookupZipCode(zipCode?: string | null): Promise<ZipCodeLookupResult | null> {
    const normalizedZipCode = this.normalizeZipCode(zipCode);
    if (!normalizedZipCode || normalizedZipCode.length !== 8) return null;
    try {
      return await this.zipCodeLookupService.lookup(normalizedZipCode);
    } catch (error) {
      this.log.warn('Destination zip lookup failed', { zipCode: normalizedZipCode, error });
      return null;
    }
  }

  private zipLookupHasCoordinates(lookup?: ZipCodeLookupResult | null) {
    return this.hasCoordinatePair(lookup?.latitude, lookup?.longitude);
  }

  private hasCoordinatePair(lat?: number | null, lng?: number | null) {
    return hasUsableBrazilCoordinatePair(lat, lng);
  }

  private destinationFallbackCoordinates(destination?: { lat?: number | null; lng?: number | null } | null) {
    return this.hasCoordinatePair(destination?.lat, destination?.lng)
      ? { lat: Number(destination?.lat), lng: Number(destination?.lng) }
      : { lat: null, lng: null };
  }

  private coordinateQuality(
    lat: number | null,
    lng: number | null,
    quality?: Parameters<typeof buildGeoQuality>[0]
  ): ResolvedDestinationCoordinates {
    const normalized = buildGeoQuality(quality);
    return {
      lat,
      lng,
      geoSource: normalized.geoSource,
      geoPrecision: normalized.geoPrecision,
      geoVerified: normalized.geoVerified,
      geocodedAt: normalized.geocodedAt ? new Date(normalized.geocodedAt) : null,
      formattedAddress: normalized.formattedAddress || null,
    };
  }

  private existingCoordinateQuality(current?: any | null): ResolvedDestinationCoordinates {
    const lat = this.hasCoordinatePair(current?.lat, current?.lng) ? Number(current.lat) : null;
    const lng = this.hasCoordinatePair(current?.lat, current?.lng) ? Number(current.lng) : null;
    return this.coordinateQuality(lat, lng, {
      geoSource: current?.geoSource || 'unknown',
      geoPrecision: current?.geoPrecision || 'unknown',
      geoVerified: current?.geoVerified === true,
      geocodedAt: current?.geocodedAt || null,
      formattedAddress: current?.formattedAddress || null,
    });
  }

  private submittedCoordinatesForAddressChange(payload: any, current: any | null, addressChanged: boolean) {
    const hasLatInput = Object.prototype.hasOwnProperty.call(payload || {}, 'lat');
    const hasLngInput = Object.prototype.hasOwnProperty.call(payload || {}, 'lng');
    if (!hasLatInput && !hasLngInput) {
      return {
        lat: addressChanged ? null : current?.lat ?? null,
        lng: addressChanged ? null : current?.lng ?? null,
        hasCoordinateInput: false,
      };
    }

    const lat = hasLatInput ? toNullableNumber(payload.lat) : current?.lat ?? null;
    const lng = hasLngInput ? toNullableNumber(payload.lng) : current?.lng ?? null;
    const isStaleExistingPair = Boolean(addressChanged && current && sameCoordinatePair(lat, lng, current.lat, current.lng));
    return {
      lat: isStaleExistingPair ? null : lat,
      lng: isStaleExistingPair ? null : lng,
      hasCoordinateInput: !isStaleExistingPair,
    };
  }

  private async resolveDestinationCoordinates(payload: {
    address?: string | null;
    addressNumber?: string | null;
    district?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
    lat?: number | null;
    lng?: number | null;
    fallbackLat?: number | null;
    fallbackLng?: number | null;
    scope: string;
  }): Promise<ResolvedDestinationCoordinates> {
    const lat = payload.lat ?? null;
    const lng = payload.lng ?? null;
    if (this.hasCoordinatePair(lat, lng)) {
      return this.coordinateQuality(Number(lat), Number(lng), {
        geoSource: 'manual_pin',
        geoPrecision: 'exact',
        geoVerified: true,
        geocodedAt: new Date(),
      });
    }

    const zipLookup = await this.lookupZipCode(payload.zipCode);
    const baseAddress = this.buildDestinationGeocodeAddress(payload);
    const hasStreetLevelAddress = Boolean(toOptionalText(payload.address) || toOptionalText(zipLookup?.street));
    const candidates = hasStreetLevelAddress
      ? buildDestinationGeocodeCandidates(payload, zipLookup)
      : [];

    for (const address of candidates) {
      try {
        const geocoded = await this.geoLocationService.geocodeAddress(address);
        if (geocoded && this.hasCoordinatePair(geocoded.lat, geocoded.lng)) {
          return this.coordinateQuality(Number(geocoded.lat), Number(geocoded.lng), {
            geoSource: 'geocoder',
            geoPrecision: 'street',
            geoVerified: false,
            geocodedAt: new Date(),
            formattedAddress: geocoded.formattedAddress || address,
          });
        }
      } catch (error) {
        this.log.warn('Destination geocode failed', { scope: payload.scope, address, error });
      }
    }

    if (this.zipLookupHasCoordinates(zipLookup)) {
      return this.coordinateQuality(Number(zipLookup?.latitude), Number(zipLookup?.longitude), {
        geoSource: 'zip_code',
        geoPrecision: 'zip',
        geoVerified: false,
        geocodedAt: new Date(),
        formattedAddress: baseAddress || null,
      });
    }

    if (this.hasCoordinatePair(payload.fallbackLat, payload.fallbackLng)) {
      return this.coordinateQuality(Number(payload.fallbackLat), Number(payload.fallbackLng), {
        geoSource: 'city_fallback',
        geoPrecision: 'city',
        geoVerified: false,
        formattedAddress: baseAddress || null,
      });
    }

    return this.coordinateQuality(null, null, {
      geoSource: 'unknown',
      geoPrecision: 'unknown',
      geoVerified: false,
      formattedAddress: baseAddress || null,
    });
  }

  async adminSaveDestination(payload: any, destinationId?: string) {
    const current = destinationId ? await this.repository.findDestinationById(destinationId) : null;
    if (destinationId && !current) throw new AppError('DEST-001', 404);
    const name = String(payload?.name || current?.name || '').trim();
    if (!name) throw new AppError('DEST-004', 400);
    const slug = normalizeDestinationSlug(payload?.slug || current?.slug || name);
    const destinationWithSameSlug = await this.repository.findDestinationBySlug(slug, false);
    if (destinationWithSameSlug && (!current || destinationWithSameSlug.id !== current.id)) {
      throw new AppError('DEST-013', 409, {
        slug,
        existingDestinationId: destinationWithSameSlug.id,
        existingDestinationName: destinationWithSameSlug.name,
      });
    }
    const logoUrl = await saveBase64Image(payload?.logoFile, `destination-logo-${slug}`, 'destinations');
    const bannerUrl = await saveBase64Image(payload?.bannerFile, `destination-banner-${slug}`, 'destinations');
    const hasLogoUrlInput = Object.prototype.hasOwnProperty.call(payload || {}, 'logoUrl');
    const hasBannerUrlInput = Object.prototype.hasOwnProperty.call(payload || {}, 'bannerUrl');
    let saved;
    try {
      saved = await this.repository.saveDestination({
        ...(current || {}),
        name,
        slug,
        city: toOptionalText(payload?.city) ?? current?.city ?? null,
        state: toOptionalText(payload?.state)?.toUpperCase() ?? current?.state ?? null,
        description: payload?.description !== undefined ? toOptionalText(payload.description) : current?.description ?? null,
        heroTitle: payload?.heroTitle !== undefined ? toOptionalText(payload.heroTitle) : current?.heroTitle ?? null,
        heroSubtitle: payload?.heroSubtitle !== undefined ? toOptionalText(payload.heroSubtitle) : current?.heroSubtitle ?? null,
        logoUrl: logoUrl || (hasLogoUrlInput ? toOptionalText(payload?.logoUrl) : (current?.logoUrl ?? null)),
        bannerUrl: bannerUrl || (hasBannerUrlInput ? toOptionalText(payload?.bannerUrl) : (current?.bannerUrl ?? null)),
        lat: payload?.lat !== undefined ? toNullableNumber(payload.lat) : current?.lat ?? null,
        lng: payload?.lng !== undefined ? toNullableNumber(payload.lng) : current?.lng ?? null,
        active: payload?.active !== false,
        sortOrder: Number(payload?.sortOrder ?? current?.sortOrder ?? 0) || 0,
      });
    } catch (error: any) {
      if (String(error?.code || '') === '23505') {
        throw new AppError('DEST-013', 409, { slug });
      }
      throw error;
    }
    return this.toPublicDestination(saved);
  }

  async adminSaveBanner(payload: any, bannerId?: string) {
    const current = bannerId ? await this.repository.findBannerById(bannerId) : null;
    if (bannerId && !current) throw new AppError('DEST-005', 404);
    const destinationId = String(payload?.destinationId || current?.destinationId || '').trim();
    const destination = await this.repository.findDestinationById(destinationId);
    if (!destination) throw new AppError('DEST-001', 404);
    const title = String(payload?.title || current?.title || '').trim();
    if (!title) throw new AppError('DEST-006', 400);
    const imageUrl = await saveBase64Image(payload?.imageFile, `destination-banner-card-${destination.slug}-${Date.now()}`, 'destinations');
    const hasImageUrlInput = Object.prototype.hasOwnProperty.call(payload || {}, 'imageUrl');
    const saved = await this.repository.saveBanner({
      ...(current || {}),
      destinationId,
      title,
      subtitle: payload?.subtitle !== undefined ? toOptionalText(payload.subtitle) : current?.subtitle ?? null,
      imageUrl: imageUrl || (hasImageUrlInput ? toOptionalText(payload?.imageUrl) : (current?.imageUrl ?? null)),
      actionType: payload?.actionType !== undefined ? toOptionalText(payload.actionType) : current?.actionType ?? null,
      actionTarget: payload?.actionTarget !== undefined ? toOptionalText(payload.actionTarget) : current?.actionTarget ?? null,
      sortOrder: Number(payload?.sortOrder ?? current?.sortOrder ?? 0) || 0,
      active: payload?.active !== false,
    });
    return this.toPublicBanner(saved);
  }

  async adminSaveHospitalityPlace(payload: any, placeId?: string) {
    const current = placeId ? await this.repository.findPlaceById(placeId) : null;
    if (placeId && !current) throw new AppError('DEST-002', 404);
    const destinationId = String(payload?.destinationId || current?.destinationId || '').trim();
    const destination = await this.repository.findDestinationById(destinationId);
    if (!destination) throw new AppError('DEST-001', 404);
    const name = String(payload?.name || current?.name || '').trim();
    if (!name) throw new AppError('DEST-007', 400);
    const slug = await this.resolvePlaceSlug(destination.id, normalizeDestinationSlug(payload?.slug || current?.slug || name), current?.id);
    const logoUrl = await saveBase64Image(payload?.logoFile, `hospitality-logo-${slug}`, 'destinations');
    const bannerUrl = await saveBase64Image(payload?.bannerFile, `hospitality-banner-${slug}`, 'destinations');
    const hasBannerUrlInput = Object.prototype.hasOwnProperty.call(payload || {}, 'bannerUrl');
    const hasBannerGalleryInput =
      Object.prototype.hasOwnProperty.call(payload || {}, 'bannerUrls') ||
      Object.prototype.hasOwnProperty.call(payload || {}, 'bannerFiles');
    const uploadedBannerSlots = await this.saveHospitalityBannerImages(payload?.bannerFiles, slug);
    const submittedBannerSlots = mergeHospitalityBannerSlots(payload?.bannerUrls, uploadedBannerSlots);
    const requestedBannerUrls = hasBannerGalleryInput
      ? normalizeHospitalityBannerUrls(submittedBannerSlots)
      : normalizeHospitalityBannerUrls(current?.bannerUrls);
    const resolvedBannerUrl = bannerUrl || (hasBannerUrlInput ? toOptionalText(payload?.bannerUrl) : (current?.bannerUrl ?? null));
    const bannerUrls = hasBannerGalleryInput
      ? normalizeHospitalityBannerUrls(resolvedBannerUrl, requestedBannerUrls)
      : normalizeHospitalityBannerUrls(resolvedBannerUrl, current?.bannerUrls);
    const address = payload?.address !== undefined ? toOptionalText(payload.address) : current?.address ?? null;
    const addressNumber = payload?.addressNumber !== undefined ? toOptionalText(payload.addressNumber) : current?.addressNumber ?? null;
    const district = payload?.district !== undefined ? toOptionalText(payload.district) : current?.district ?? null;
    const city = payload?.city !== undefined ? toOptionalText(payload.city) : current?.city ?? destination.city ?? null;
    const state = payload?.state !== undefined ? this.normalizeStateCode(payload.state) : current?.state ?? destination.state ?? null;
    const zipCode = payload?.zipCode !== undefined ? this.normalizeZipCode(payload.zipCode) : current?.zipCode ?? null;
    const addressChanged = Boolean(current) && (
      (payload?.address !== undefined && address !== (current?.address ?? null)) ||
      (payload?.addressNumber !== undefined && addressNumber !== (current?.addressNumber ?? null)) ||
      (payload?.district !== undefined && district !== (current?.district ?? null)) ||
      (payload?.city !== undefined && city !== (current?.city ?? null)) ||
      (payload?.state !== undefined && state !== (current?.state ?? null)) ||
      (payload?.zipCode !== undefined && zipCode !== (current?.zipCode ?? null))
    );
    const fallbackCoordinates = this.destinationFallbackCoordinates(destination);
    const submittedCoordinates = this.submittedCoordinatesForAddressChange(payload, current, addressChanged);
    const coordinates = (!addressChanged && !submittedCoordinates.hasCoordinateInput && this.hasCoordinatePair(current?.lat, current?.lng))
      ? this.existingCoordinateQuality(current)
      : await this.resolveDestinationCoordinates({
      address,
      addressNumber,
      district,
      city,
      state,
      zipCode,
      lat: submittedCoordinates.lat,
      lng: submittedCoordinates.lng,
      fallbackLat: fallbackCoordinates.lat,
      fallbackLng: fallbackCoordinates.lng,
      scope: 'hospitality_place',
    });
    const saved = await this.repository.savePlace({
      ...(current || {}),
      destinationId: destination.id,
      name,
      slug,
      type: normalizeHospitalityPlaceType(payload?.type || current?.type),
      description: payload?.description !== undefined ? toOptionalText(payload.description) : current?.description ?? null,
      address,
      addressNumber,
      district,
      city,
      state,
      zipCode,
      lat: coordinates.lat,
      lng: coordinates.lng,
      geoSource: coordinates.geoSource,
      geoPrecision: coordinates.geoPrecision,
      geoVerified: coordinates.geoVerified,
      geocodedAt: coordinates.geocodedAt,
      formattedAddress: coordinates.formattedAddress,
      phone: payload?.phone !== undefined ? toOptionalText(payload.phone) : current?.phone ?? null,
      whatsapp: payload?.whatsapp !== undefined ? toOptionalText(payload.whatsapp) : current?.whatsapp ?? null,
      instagramUrl: payload?.instagramUrl !== undefined ? normalizeInstagramUrl(payload.instagramUrl) : current?.instagramUrl ?? null,
      websiteUrl: payload?.websiteUrl !== undefined ? normalizeExternalUrl(payload.websiteUrl) : current?.websiteUrl ?? null,
      logoUrl: logoUrl || toOptionalText(payload?.logoUrl) || current?.logoUrl || null,
      bannerUrl: resolvedBannerUrl || bannerUrls[0] || null,
      bannerUrls,
      amenities: Array.isArray(payload?.amenities) ? payload.amenities.map((item: any) => String(item || '').trim()).filter(Boolean) : current?.amenities || [],
      deliveryInstructions: payload?.deliveryInstructions !== undefined ? toOptionalText(payload.deliveryInstructions) : current?.deliveryInstructions ?? null,
      active: payload?.active !== false,
      sortOrder: Number(payload?.sortOrder ?? current?.sortOrder ?? 0) || 0,
    });
    return this.toPublicPlace({ ...saved, destination });
  }

  async adminSaveListing(payload: any, listingId?: string) {
    const current = listingId ? await this.repository.findListingById(listingId) : null;
    if (listingId && !current) throw new AppError('DEST-008', 404);
    const destinationId = String(payload?.destinationId || current?.destinationId || '').trim();
    const destination = await this.repository.findDestinationById(destinationId);
    if (!destination) throw new AppError('DEST-001', 404);
    const title = String(payload?.title || current?.title || '').trim();
    if (!title) throw new AppError('DEST-009', 400);
    const imageUrl = await saveBase64Image(payload?.imageFile, `destination-listing-${normalizeDestinationSlug(title)}`, 'destinations');
    const placeLinks = this.normalizeListingHospitalityPlaceLinks(payload, current);
    const placeIds = placeLinks.map((link) => link.hospitalityPlaceId);
    await this.assertListingHospitalityPlaces(placeIds, destination.id);
    const placeId = placeIds[0] || null;
    const hasStoreInput = Object.prototype.hasOwnProperty.call(payload || {}, 'storeId');
    const storeId = hasStoreInput ? toOptionalText(payload?.storeId) : current?.storeId || null;
    if (storeId && !(await this.repository.findStoreById(storeId))) throw new AppError('STORE-001', 404);
    const address = payload?.address !== undefined ? toOptionalText(payload.address) : current?.address ?? null;
    const addressNumber = payload?.addressNumber !== undefined ? toOptionalText(payload.addressNumber) : current?.addressNumber ?? null;
    const district = payload?.district !== undefined ? toOptionalText(payload.district) : current?.district ?? null;
    const city = payload?.city !== undefined ? toOptionalText(payload.city) : current?.city ?? destination.city ?? null;
    const state = payload?.state !== undefined ? this.normalizeStateCode(payload.state) : current?.state ?? destination.state ?? null;
    const zipCode = payload?.zipCode !== undefined ? this.normalizeZipCode(payload.zipCode) : current?.zipCode ?? null;
    const addressChanged = Boolean(current) && (
      (payload?.address !== undefined && address !== (current?.address ?? null)) ||
      (payload?.addressNumber !== undefined && addressNumber !== (current?.addressNumber ?? null)) ||
      (payload?.district !== undefined && district !== (current?.district ?? null)) ||
      (payload?.city !== undefined && city !== (current?.city ?? null)) ||
      (payload?.state !== undefined && state !== (current?.state ?? null)) ||
      (payload?.zipCode !== undefined && zipCode !== (current?.zipCode ?? null))
    );
    const fallbackCoordinates = this.destinationFallbackCoordinates(destination);
    const submittedCoordinates = this.submittedCoordinatesForAddressChange(payload, current, addressChanged);
    const coordinates = (!addressChanged && !submittedCoordinates.hasCoordinateInput && this.hasCoordinatePair(current?.lat, current?.lng))
      ? this.existingCoordinateQuality(current)
      : await this.resolveDestinationCoordinates({
      address,
      addressNumber,
      district,
      city,
      state,
      zipCode,
      lat: submittedCoordinates.lat,
      lng: submittedCoordinates.lng,
      fallbackLat: fallbackCoordinates.lat,
      fallbackLng: fallbackCoordinates.lng,
      scope: 'destination_listing',
    });
    const saved = await this.repository.saveListing({
      id: current?.id,
      destinationId: destination.id,
      hospitalityPlaceId: placeId,
      storeId,
      category: normalizeDestinationListingCategory(payload?.category || current?.category),
      title,
      description: payload?.description !== undefined ? toOptionalText(payload.description) : current?.description ?? null,
      imageUrl: imageUrl || toOptionalText(payload?.imageUrl) || current?.imageUrl || null,
      address,
      addressNumber,
      district,
      city,
      state,
      zipCode,
      lat: coordinates.lat,
      lng: coordinates.lng,
      geoSource: coordinates.geoSource,
      geoPrecision: coordinates.geoPrecision,
      geoVerified: coordinates.geoVerified,
      geocodedAt: coordinates.geocodedAt,
      formattedAddress: coordinates.formattedAddress,
      phone: payload?.phone !== undefined ? toOptionalText(payload.phone) : current?.phone ?? null,
      whatsapp: payload?.whatsapp !== undefined ? toOptionalText(payload.whatsapp) : current?.whatsapp ?? null,
      instagramUrl: payload?.instagramUrl !== undefined ? normalizeInstagramUrl(payload.instagramUrl) : current?.instagramUrl ?? null,
      websiteUrl: payload?.websiteUrl !== undefined ? normalizeExternalUrl(payload.websiteUrl) : current?.websiteUrl ?? null,
      ctaType: payload?.ctaType !== undefined ? toOptionalText(payload.ctaType) : current?.ctaType ?? null,
      ctaUrl: payload?.ctaUrl !== undefined ? toOptionalText(payload.ctaUrl) : current?.ctaUrl ?? null,
      featured: payload?.featured !== undefined ? payload.featured === true : current?.featured === true,
      active: payload?.active !== undefined ? payload.active !== false : current?.active !== false,
      sortOrder: Number(payload?.sortOrder ?? current?.sortOrder ?? 0) || 0,
    });
    await this.repository.syncListingHospitalityPlaces(saved.id, placeLinks);
    const hydrated = await this.repository.findListingById(saved.id);
    const [listing] = await this.withListingHospitalityPlaces([{ ...(hydrated || saved), destination: hydrated?.destination || destination }]);
    return this.toPublicListing(listing);
  }

  async adminLinkStore(placeId: string, payload: any) {
    const storeId = String(payload?.storeId || '').trim();
    const [place, store] = await Promise.all([
      this.repository.findPlaceById(placeId),
      this.repository.findStoreById(storeId),
    ]);
    if (!place) throw new AppError('DEST-002', 404);
    if (!store) throw new AppError('STORE-001', 404);
    const link = await this.repository.upsertStoreLink(place.id, store.id, {
      deliveryEnabled: payload?.deliveryEnabled !== false,
      pickupEnabled: payload?.pickupEnabled === true,
      deliveryFee: toNullableNumber(payload?.deliveryFee),
      estimatedMinutes: toNullableNumber(payload?.estimatedMinutes) ?? null,
      notes: toOptionalText(payload?.notes),
      recommended: payload?.recommended === true,
      sortOrder: Number(payload?.sortOrder || 0) || 0,
    });
    return this.toPublicStoreLink(link);
  }

  async createListingClaimFromVerifiedStore(storeId: string, owner?: { fullName?: string | null; email?: string | null; phone?: string | null } | null) {
    const store = await this.repository.findStoreById(String(storeId || '').trim());
    const attribution = store?.settings?.acquisitionAttribution as any;
    if (!store || !attribution || String(attribution.source || '') !== 'destination_listing_claim') return null;

    const listingId = toOptionalText(attribution.destinationListingId || attribution.listingId);
    if (!listingId) return null;

    const listing = await this.repository.findListingById(listingId);
    if (!listing || String(listing.destinationId) !== String(attribution.destinationId || listing.destinationId)) {
      this.log.warn('Destination listing claim ignored: listing not found or destination mismatch', {
        storeId: store.id,
        listingId,
        destinationId: attribution.destinationId || null,
      });
      return null;
    }

    if (listing.storeId && String(listing.storeId) !== String(store.id)) {
      this.log.warn('Destination listing claim ignored: listing already linked to another store', {
        storeId: store.id,
        listingId: listing.id,
        linkedStoreId: listing.storeId,
      });
      return null;
    }

    const existing = await this.repository.findPendingPartnerRequestByStoreAndListing(store.id, listing.id);
    if (existing) return this.toPublicPartnerRequest(existing);

    const responsibleEmail = toOptionalText(owner?.email || store.settings?.contactEmail);
    if (!responsibleEmail) return null;

    const saved = await this.repository.savePartnerRequest({
      destinationId: listing.destinationId,
      partnerType: 'SERVICE_PROVIDER',
      category: listing.category || 'SERVICO',
      name: listing.title || store.name,
      slug: normalizeDestinationSlug(listing.title || store.name),
      description: listing.description || store.settings?.description || null,
      address: listing.address || store.settings?.address || null,
      city: listing.city || store.settings?.city || listing.destination?.city || null,
      state: listing.state || store.settings?.state || listing.destination?.state || null,
      zipCode: listing.zipCode || store.settings?.postalOriginZip || null,
      phone: listing.phone || owner?.phone || null,
      whatsapp: listing.whatsapp || owner?.phone || null,
      instagramUrl: listing.instagramUrl || null,
      websiteUrl: listing.websiteUrl || null,
      logoUrl: store.settings?.logoUrl || null,
      bannerUrl: store.settings?.bannerUrl || null,
      imageUrl: listing.imageUrl || store.settings?.bannerUrl || store.settings?.logoUrl || null,
      requestSource: 'store_signup_destination_claim',
      claimedListingId: listing.id,
      storeId: store.id,
      responsibleName: toOptionalText(owner?.fullName) || store.name,
      responsibleEmail,
      responsiblePhone: toOptionalText(owner?.phone),
      message: `Loja criada a partir do serviço "${listing.title}". Validar posse antes de converter o serviço em loja.`,
      status: 'pending',
    });

    const targetPlaceIds = await this.resolveListingClaimTargetPlaceIds(attribution, listing);
    const targetPlaceNames: string[] = [];
    for (const placeId of targetPlaceIds) {
      const place = await this.repository.findPlaceById(placeId);
      if (!place || place.active === false || String(place.destinationId) !== String(listing.destinationId)) continue;
      if (place.name) targetPlaceNames.push(String(place.name));
      const existingLink = await this.repository.findStoreLink(place.id, store.id);
      if (existingLink?.active) continue;
      const existingRequest = await this.repository.findStoreRequestByStoreAndPlace(store.id, place.id);
      await this.repository.saveStoreRequest({
        ...(existingRequest || {}),
        storeId: store.id,
        hospitalityPlaceId: place.id,
        status: 'pending',
        message: `Solicitação automática ao assumir o serviço "${listing.title}". Claim ${saved.id}.`,
        deliveryEnabled: true,
        pickupEnabled: false,
        deliveryFee: null,
        estimatedMinutes: null,
        reviewNote: null,
        reviewedBy: null,
        reviewedAt: null,
      });
    }

    if (!targetPlaceNames.length && Array.isArray(attribution?.destinationHospitalityPlaceNames)) {
      targetPlaceNames.push(
        ...attribution.destinationHospitalityPlaceNames
          .map((name: any) => String(name || '').trim())
          .filter(Boolean)
      );
    }

    void this.notifyPartnerRequestByEmail({
      requestId: saved.id,
      partnerType: saved.partnerType,
      resourceName: saved.name,
      destinationName: listing.destination?.name || listing.destination?.city || null,
      responsibleName: saved.responsibleName,
      responsibleEmail: saved.responsibleEmail,
      responsiblePhone: saved.responsiblePhone || null,
      city: saved.city || null,
      state: saved.state || null,
      message: saved.message || null,
    }).catch((error) => {
      this.log.error('Destination listing claim notification failed', {
        requestId: saved.id,
        storeId: store.id,
        listingId: listing.id,
        error,
      });
    });

    void this.emailService.sendDestinationStoreClaimPending({
      email: responsibleEmail,
      responsibleName: saved.responsibleName,
      storeName: store.name,
      listingName: listing.title || saved.name,
      destinationName: listing.destination?.name || listing.destination?.city || null,
      placeNames: Array.from(new Set(targetPlaceNames)),
      requestId: saved.id,
    }).catch((error) => {
      this.log.error('Destination listing claim pending email failed', {
        requestId: saved.id,
        storeId: store.id,
        listingId: listing.id,
        error,
      });
    });

    return this.toPublicPartnerRequest({ ...saved, destination: listing.destination, claimedListing: listing, store });
  }

  async getStoreListingClaimAccessBlock(storeId: string) {
    const request = await this.repository.findLatestListingClaimRequestByStoreId(String(storeId || '').trim());
    if (!request) return null;
    if (String(request.status || '').toLowerCase() === 'approved') return null;
    return {
      requestId: request.id,
      status: request.status,
      resourceName: request.name || request.claimedListing?.title || 'serviço',
      destinationName: request.destination?.name || request.destination?.city || null,
    };
  }

  private async resolveListingClaimTargetPlaceIds(attribution: any, listing: any): Promise<string[]> {
    const mode = String(attribution?.destinationDeliveryMode || '').trim().toLowerCase();
    const selectedIds = Array.isArray(attribution?.destinationHospitalityPlaceIds)
      ? attribution.destinationHospitalityPlaceIds.map((id: any) => String(id || '').trim()).filter(Boolean)
      : [];
    if (mode === 'selected' && selectedIds.length) return Array.from(new Set(selectedIds));
    if (mode === 'all') {
      const places = await this.repository.listPlacesByDestinationId(listing.destinationId);
      return places.map((place: any) => String(place.id)).filter(Boolean);
    }
    const listingPlaceIds = this.listingHospitalityPlaceIds(listing);
    return Array.from(new Set(listingPlaceIds));
  }

  private async approveStoreListingClaim(request: any, listing: any, reviewedBy?: string, reviewNote?: string | null) {
    const storeId = toOptionalText(request.storeId);
    if (!storeId) throw new AppError('STORE-001', 404);
    const store = await this.repository.findStoreById(storeId);
    if (!store) throw new AppError('STORE-001', 404);
    if (!listing || String(listing.destinationId) !== String(request.destinationId)) throw new AppError('DEST-012', 404);
    if (listing.storeId && String(listing.storeId) !== String(store.id)) throw new AppError('DPARTNER-013', 409);

    const scopedRequests = await this.repository.listStoreRequestsByStoreAndMessageToken(store.id, request.id);
    let targetPlaceIds = scopedRequests.map((item: any) => String(item.hospitalityPlaceId)).filter(Boolean);
    if (!targetPlaceIds.length) targetPlaceIds = this.listingHospitalityPlaceIds(listing);

    for (const storeRequest of scopedRequests) {
      await this.repository.upsertStoreLink(storeRequest.hospitalityPlaceId, store.id, {
        deliveryEnabled: storeRequest.deliveryEnabled !== false,
        pickupEnabled: storeRequest.pickupEnabled === true,
        deliveryFee: storeRequest.deliveryFee ?? null,
        estimatedMinutes: storeRequest.estimatedMinutes ?? null,
        notes: storeRequest.message || null,
      });
      storeRequest.status = 'approved';
      storeRequest.reviewNote = reviewNote || 'Aprovado junto com a conversão do serviço em loja.';
      storeRequest.reviewedBy = reviewedBy || null;
      storeRequest.reviewedAt = new Date();
      await this.repository.saveStoreRequest(storeRequest);
    }

    if (!scopedRequests.length) {
      for (const placeId of Array.from(new Set(targetPlaceIds))) {
        await this.repository.upsertStoreLink(placeId, store.id, {
          deliveryEnabled: true,
          pickupEnabled: false,
          notes: `Convertido do serviço "${listing.title}".`,
        });
      }
    }

    listing.storeId = store.id;
    listing.active = false;
    await this.repository.saveListing(listing);
    if (!store.open) {
      store.open = true;
      await this.repository.saveStore(store);
    }
    request.createdListingId = listing.id;
    (request as any).createdListing = undefined;
    (request as any).store = store;
  }

  private async rejectStoreListingClaim(request: any, reviewedBy?: string, reviewNote?: string | null) {
    const storeId = toOptionalText(request?.storeId);
    const requestId = toOptionalText(request?.id);
    if (!storeId || !requestId) return;
    const scopedRequests = await this.repository.listStoreRequestsByStoreAndMessageToken(storeId, requestId);
    for (const storeRequest of scopedRequests) {
      if (String(storeRequest.status || '').toLowerCase() === 'approved') continue;
      storeRequest.status = 'rejected';
      storeRequest.reviewNote = reviewNote || 'Solicitação principal recusada na validação de posse.';
      storeRequest.reviewedBy = reviewedBy || null;
      storeRequest.reviewedAt = new Date();
      await this.repository.saveStoreRequest(storeRequest);
    }
  }

  private listingClaimRequestIdFromStoreRequest(request: any) {
    const message = String(request?.message || '');
    const match = message.match(/\bClaim\s+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i);
    return match?.[1] || null;
  }

  private claimHospitalityPlaceNames(request: any) {
    const fromLinkedRequests = (Array.isArray(request?.requestedStoreRequests) ? request.requestedStoreRequests : [])
      .map((item: any) => item?.hospitalityPlace?.name)
      .filter(Boolean);
    const attribution = request?.store?.settings?.acquisitionAttribution || {};
    const fromAttribution = Array.isArray(attribution?.destinationHospitalityPlaceNames)
      ? attribution.destinationHospitalityPlaceNames
      : [];
    return Array.from(new Set([...fromLinkedRequests, ...fromAttribution].map((item) => String(item || '').trim()).filter(Boolean)));
  }

  private async notifyStoreListingClaimReviewed(request: any, approved: boolean, reviewNote?: string | null) {
    const email = toOptionalText(request?.store?.owner?.email || request?.responsibleEmail || request?.store?.settings?.contactEmail);
    if (!email) return;
    try {
      await this.emailService.sendDestinationStoreClaimReviewed({
        email,
        responsibleName: request?.store?.owner?.fullName || request?.responsibleName || request?.store?.name || null,
        storeName: request?.store?.name || request?.name || null,
        listingName: request?.claimedListing?.title || request?.name || null,
        destinationName: request?.destination?.name || request?.destination?.city || null,
        placeNames: this.claimHospitalityPlaceNames(request),
        reviewNote,
        approved,
        requestId: request?.id || null,
      });
    } catch (error) {
      this.log.error('Destination store claim review email failed', {
        requestId: request?.id,
        storeId: request?.storeId,
        claimedListingId: request?.claimedListingId,
        approved,
        error,
      });
    }
  }

  async adminReviewPartnerRequest(requestId: string, payload: any, reviewedBy?: string) {
    const request = await this.repository.findPartnerRequestById(requestId);
    if (!request) throw new AppError('DEST-010', 404);
    const status = this.normalizeReviewStatus(payload?.status);
    const isClaimRequest = Boolean(request.claimedHospitalityPlaceId || request.claimedListingId);
    const previousStatus = String(request.status || '').toLowerCase();
    if (status === 'approved' && request.status !== 'approved' && isClaimRequest && payload?.claimVerified !== true) {
      throw new AppError('DPARTNER-010', 400);
    }
    const reviewNote = toOptionalText(payload?.reviewNote);
    if (status === 'approved' && request.status !== 'approved' && isClaimRequest && String(reviewNote || '').trim().length < 12) {
      throw new AppError('DPARTNER-012', 400);
    }
    if (status === 'rejected' && request.status !== 'rejected' && isClaimRequest && String(reviewNote || '').trim().length < 12) {
      throw new AppError('DPARTNER-014', 400);
    }
    let partnerActivationToken: string | null | undefined;
    if (status === 'approved' && request.status !== 'approved') {
      if (String(request.partnerType || '').toUpperCase() === 'SERVICE_PROVIDER') {
        const claimedListingId = toOptionalText(request.claimedListingId);
        const listing = claimedListingId
          ? await this.repository.findListingById(claimedListingId)
          : await this.adminSaveListing({
              destinationId: request.destinationId,
              title: request.name,
              category: request.category || 'SERVICO',
              description: request.description,
              imageUrl: request.imageUrl || request.bannerUrl || request.logoUrl,
              address: request.address,
              city: request.city,
              state: request.state,
              zipCode: request.zipCode,
              phone: request.phone,
              whatsapp: request.whatsapp,
              instagramUrl: request.instagramUrl,
              websiteUrl: request.websiteUrl,
              ctaType: request.whatsapp ? 'WHATSAPP' : request.websiteUrl ? 'SITE' : null,
              ctaUrl: request.whatsapp || request.websiteUrl || request.instagramUrl || null,
              active: true,
            });
        if (!listing || String(listing.destinationId) !== String(request.destinationId)) throw new AppError('DEST-012', 404);
        if (request.storeId && claimedListingId) {
          await this.approveStoreListingClaim(request, listing, reviewedBy, reviewNote);
        } else {
          request.createdListingId = listing.id;
          const access = await this.destinationPartnerPortalService.ensureAccessForApprovedRequest({
            request,
            resourceType: RESOURCE_DESTINATION_LISTING,
            resourceId: listing.id,
            resourceName: listing.title,
            reviewedBy,
          });
          request.createdPartnerAccountId = access.accountId;
          partnerActivationToken = access.activationToken;
          (request as any).createdListing = undefined;
          (request as any).createdPartnerAccount = undefined;
        }
      } else {
        const claimedPlaceId = toOptionalText(request.claimedHospitalityPlaceId);
        const place = claimedPlaceId
          ? await this.repository.findPlaceById(claimedPlaceId)
          : await this.adminSaveHospitalityPlace({
              destinationId: request.destinationId,
              name: request.name,
              slug: request.slug,
              type: request.placeType || 'CHALE',
              description: request.description,
              address: request.address,
              city: request.city,
              state: request.state,
              zipCode: request.zipCode,
              phone: request.phone,
              whatsapp: request.whatsapp,
              instagramUrl: request.instagramUrl,
              websiteUrl: request.websiteUrl,
              logoUrl: request.logoUrl,
              bannerUrl: request.bannerUrl,
              deliveryInstructions: request.deliveryInstructions,
              active: true,
            });
        if (!place || String(place.destinationId) !== String(request.destinationId)) throw new AppError('DEST-002', 404);
        request.createdHospitalityPlaceId = place.id;
        const access = await this.destinationPartnerPortalService.ensureAccessForApprovedRequest({
          request,
          resourceType: RESOURCE_HOSPITALITY_PLACE,
          resourceId: place.id,
          resourceName: place.name,
          reviewedBy,
        });
        request.createdPartnerAccountId = access.accountId;
        partnerActivationToken = access.activationToken;
        (request as any).createdHospitalityPlace = undefined;
        (request as any).createdPartnerAccount = undefined;
      }
    } else if (
      status === 'rejected' &&
      request.status !== 'rejected' &&
      request.storeId &&
      request.claimedListingId
    ) {
      await this.rejectStoreListingClaim(request, reviewedBy, reviewNote);
    }
    request.status = status;
    request.reviewNote = reviewNote;
    request.reviewedBy = reviewedBy || null;
    request.reviewedAt = new Date();
    const saved = await this.repository.savePartnerRequest(request);
    if (
      previousStatus !== status &&
      isClaimRequest &&
      request.storeId &&
      request.claimedListingId &&
      (status === 'approved' || status === 'rejected')
    ) {
      await this.notifyStoreListingClaimReviewed(request, status === 'approved', reviewNote);
    }
    (saved as any).partnerActivationToken = partnerActivationToken;
    return this.toPublicPartnerRequest(saved);
  }

  async adminResendPartnerInvite(requestId: string, reviewedBy?: string) {
    const request = await this.repository.findPartnerRequestById(requestId);
    if (!request) throw new AppError('DEST-010', 404);
    if (String(request.status || '').toLowerCase() !== 'approved' || !request.createdPartnerAccountId) {
      throw new AppError('DPARTNER-009', 400);
    }

    const resourceName = request.createdHospitalityPlace?.name
      || request.createdListing?.title
      || request.name
      || 'seu cadastro';
    const invite = await this.destinationPartnerPortalService.resendInviteForApprovedRequest({
      accountId: request.createdPartnerAccountId,
      request,
      resourceName,
      reviewedBy,
    });

    (request as any).partnerActivationToken = invite.activationToken;
    (request as any).partnerActivationUrl = invite.activationUrl;
    (request as any).partnerInviteSent = invite.inviteSent;
    (request as any).partnerAlreadyActive = invite.alreadyActive;
    (request as any).partnerLoginUrl = invite.loginUrl;
    (request as any).partnerInviteExpiresAt = invite.expiresAt;
    return this.toPublicPartnerRequest(request);
  }

  async adminReviewStoreRequest(requestId: string, payload: any, reviewedBy?: string) {
    const request = await this.repository.findStoreRequestById(requestId);
    if (!request) throw new AppError('DEST-011', 404);
    const parentPartnerRequestId = this.listingClaimRequestIdFromStoreRequest(request);
    if (parentPartnerRequestId) {
      throw new AppError('DPARTNER-015', 400, { parentPartnerRequestId });
    }
    const status = this.normalizeReviewStatus(payload?.status);
    if (status === 'approved') {
      await this.repository.upsertStoreLink(request.hospitalityPlaceId, request.storeId, {
        deliveryEnabled: request.deliveryEnabled !== false,
        pickupEnabled: request.pickupEnabled === true,
        deliveryFee: request.deliveryFee ?? null,
        estimatedMinutes: request.estimatedMinutes ?? null,
        notes: request.message || null,
      });
    }
    request.status = status;
    request.reviewNote = toOptionalText(payload?.reviewNote);
    request.reviewedBy = reviewedBy || null;
    request.reviewedAt = new Date();
    const saved = await this.repository.saveStoreRequest(request);
    return this.toPublicStoreRequest(saved);
  }

  async listStoreDestinationOptions(storeId: string) {
    if (!storeId) throw new AppError('STORE-001', 404);
    const store = await this.repository.findStoreById(storeId);
    if (!store) throw new AppError('STORE-001', 404);
    const [destinations, storeRequests] = await Promise.all([
      this.repository.listActiveDestinations(),
      this.repository.listStoreRequests(undefined, storeId),
    ]);
    const placesByDestination = new Map<string, any[]>();
    for (const destination of destinations) {
      placesByDestination.set(destination.id, await this.repository.listPlacesByDestinationId(destination.id));
    }
    const allPlaces = Array.from(placesByDestination.values()).flat();
    const linkPairs = await Promise.all(allPlaces.map((place) => this.repository.findStoreLink(place.id, storeId)));
    const linkByPlace = new Map(linkPairs.filter(Boolean).map((link: any) => [String(link.hospitalityPlaceId), link]));
    const requestByPlace = new Map(storeRequests.map((request: any) => [String(request.hospitalityPlaceId), request]));

    return destinations
      .map((destination) => {
        const destinationMatch = buildDestinationStoreMatchMeta(store.settings, destination);
        return {
          ...this.toPublicDestination(destination),
          destinationMatch,
          hospitalityPlaces: (placesByDestination.get(destination.id) || []).map((place) => {
            const link = linkByPlace.get(place.id) || null;
            const request = requestByPlace.get(place.id) || null;
            const requestStatus = String(request?.status || '').toLowerCase();
            const status = link?.active ? 'approved' : requestStatus || 'available';
            return {
              ...this.toPublicPlace(place),
              status,
              link: link ? this.toPublicStoreLink(link) : null,
              request: request ? this.toPublicStoreRequest(request) : null,
            };
          }),
        };
      })
      .sort((left: any, right: any) => {
        const rankDiff = Number(left.destinationMatch?.rank ?? 9) - Number(right.destinationMatch?.rank ?? 9);
        if (rankDiff !== 0) return rankDiff;
        const sortDiff = Number(left.sortOrder || 0) - Number(right.sortOrder || 0);
        if (sortDiff !== 0) return sortDiff;
        return String(left.name || '').localeCompare(String(right.name || ''), 'pt-BR');
      });
  }

  async createStoreDestinationRequest(storeId: string, payload: any) {
    const placeId = String(payload?.hospitalityPlaceId || payload?.placeId || '').trim();
    const [store, place] = await Promise.all([
      this.repository.findStoreById(storeId),
      this.repository.findPlaceById(placeId),
    ]);
    if (!store) throw new AppError('STORE-001', 404);
    if (!place || place.active === false || place.destination?.active === false) throw new AppError('DEST-002', 404);
    const existingLink = await this.repository.findStoreLink(place.id, store.id);
    if (existingLink?.active) return { status: 'approved', link: this.toPublicStoreLink(existingLink) };
    const existing = await this.repository.findStoreRequestByStoreAndPlace(store.id, place.id);
    const saved = await this.repository.saveStoreRequest({
      ...(existing || {}),
      storeId: store.id,
      hospitalityPlaceId: place.id,
      status: 'pending',
      message: toOptionalText(payload?.message),
      deliveryEnabled: payload?.deliveryEnabled !== false,
      pickupEnabled: payload?.pickupEnabled === true,
      deliveryFee: toNullableNumber(payload?.deliveryFee),
      estimatedMinutes: toNullableNumber(payload?.estimatedMinutes) ?? null,
      reviewNote: null,
      reviewedBy: null,
      reviewedAt: null,
    });
    return this.toPublicStoreRequest({ ...saved, store, hospitalityPlace: place });
  }

  async removeStoreDestination(storeId: string, placeId: string) {
    const existing = await this.repository.findStoreRequestByStoreAndPlace(storeId, placeId);
    if (existing && String(existing.status || '').toLowerCase() === 'pending') {
      existing.status = 'cancelled';
      await this.repository.saveStoreRequest(existing);
    }
    await this.repository.deactivateStoreLink(placeId, storeId);
    return { ok: true };
  }

  private toPaginationNumber(value: any, fallback: number, min: number, max: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, Math.floor(parsed)));
  }

  private toPaginationMeta(page: number, pageSize: number, total: number) {
    const totalPages = Math.max(1, Math.ceil(Number(total || 0) / pageSize));
    return {
      page,
      pageSize,
      total: Number(total || 0),
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  private normalizeAdminStatus(value: any) {
    const normalized = String(value || 'active').toLowerCase();
    if ([ 'active', 'inactive', 'all' ].includes(normalized)) return normalized;
    return 'active';
  }

  private normalizeAdminContentType(value: any) {
    const normalized = String(value || 'all').toLowerCase();
    if ([ 'all', 'destinations', 'places', 'listings' ].includes(normalized)) return normalized;
    return 'all';
  }

  private async resolvePublicStoreLinks(links: any[]) {
    const storeIds = links.map((link) => String(link?.store?.id || '')).filter(Boolean);
    const [subscriptionsByStoreId, reviewSummariesByStoreId] = await Promise.all([
      this.subscriptionService.getCurrentByStoreIds(storeIds),
      this.orderReviewService.publicSummariesByStoreIds(storeIds),
    ]);

    const resolved = await Promise.all(
      links.map(async (link) => {
        const store = link.store;
        if (!store) return null;
        const subscription = subscriptionsByStoreId.get(String(store.id || '')) || null;
        const isVip = Boolean(store?.settings?.planExempt);
        const isActive = isVip || this.subscriptionService.isActiveSubscription(subscription);
        if (!isActive) return null;
        const features = resolvePlanFeatures({
          planName: subscription?.plan?.name,
          planExempt: Boolean(store.settings?.planExempt),
          subscriptionStatus: subscription?.status,
        });
        const baseOrderTypes = Array.isArray(store.settings?.orderTypes) && store.settings.orderTypes.length > 0
          ? store.settings.orderTypes
          : [ 'delivery', 'pickup', 'table' ];
        const orderTypes = features.deliveryMode
          ? baseOrderTypes
          : baseOrderTypes.filter((type: string) => String(type || '').toLowerCase() !== 'delivery');
        return {
          ...this.toPublicStoreLink(link),
          store: this.toPublicStoreSummary({ ...store, settings: { ...store.settings, orderTypes } }),
          reviewSummary: reviewSummariesByStoreId.get(String(store.id || '')) || {
            totalReviews: 0,
            avgStoreRating: 0,
            totalDeliveryReviews: 0,
            avgDeliveryRating: 0,
          },
        };
      })
    );
    return resolved.filter(Boolean);
  }

  private async resolvePlaceSlug(destinationId: string, requestedSlug: string, excludeId?: string) {
    const base = requestedSlug || 'local';
    let slug = base;
    let counter = 1;
    while (await this.repository.findPlaceSlugConflict(destinationId, slug, excludeId)) {
      slug = `${base}-${counter++}`;
    }
    return slug;
  }

  private async resolvePartnerRequestDestination(payload: any): Promise<{ destination: any | null; allowInactive: boolean }> {
    const destinationId = String(payload?.destinationId || '').trim();
    if (destinationId) {
      return {
        destination: await this.repository.findDestinationById(destinationId),
        allowInactive: false,
      };
    }

    const destinationSlug = normalizeDestinationSlug(payload?.destinationSlug || '');
    if (destinationSlug) {
      return {
        destination: await this.repository.findDestinationBySlug(destinationSlug, false),
        allowInactive: false,
      };
    }

    const requestedCity = toOptionalText(
      payload?.destinationCity ||
      payload?.requestedDestinationCity ||
      payload?.requestedDestinationName
    );
    const requestedState = toOptionalText(payload?.destinationState || payload?.requestedDestinationState)?.toUpperCase().slice(0, 2) || null;
    if (!requestedCity || !requestedState) return { destination: null, allowInactive: false };

    const existingDestination = (await this.repository.listAllDestinations()).find((destination: any) => {
      const sameCity = normalizeDestinationSlug(destination?.city || destination?.name) === normalizeDestinationSlug(requestedCity);
      const sameState = String(destination?.state || '').toUpperCase().slice(0, 2) === requestedState;
      return sameCity && sameState;
    });
    if (existingDestination) {
      return {
        destination: existingDestination,
        allowInactive: true,
      };
    }

    const slug = await this.resolveDestinationSlug(normalizeDestinationSlug(`${requestedCity}-${requestedState}`) || normalizeDestinationSlug(requestedCity));
    const createdDestination = await this.repository.saveDestination({
      name: requestedCity,
      slug,
      city: requestedCity,
      state: requestedState,
      description: 'Destino solicitado por cadastro de parceiro. Revisar curadoria antes de ativar.',
      heroTitle: requestedCity,
      heroSubtitle: 'Destino em análise pelo Já no Caminho.',
      active: false,
      sortOrder: 9999,
    });

    return {
      destination: createdDestination,
      allowInactive: true,
    };
  }

  private async resolveDestinationSlug(requestedSlug: string) {
    const base = requestedSlug || 'destino';
    let slug = base;
    let counter = 1;
    while (await this.repository.findDestinationBySlug(slug, false)) {
      slug = `${base}-${counter++}`;
    }
    return slug;
  }

  private async saveHospitalityBannerImages(files: unknown, slug: string) {
    const slots = normalizeHospitalityBannerSlots(files);
    const uploaded = normalizeHospitalityBannerSlots([]);
    for (let index = 0; index < Math.min(slots.length, MAX_HOSPITALITY_BANNER_IMAGES); index += 1) {
      const imageFile = slots[index];
      if (!imageFile) continue;
      const imageUrl = await saveBase64Image(imageFile, `hospitality-banner-${slug}-${index + 1}`, 'destinations');
      if (imageUrl) uploaded[index] = imageUrl;
    }
    return uploaded;
  }

  private normalizeReviewStatus(value: unknown) {
    const status = String(value || '').trim().toLowerCase();
    if ([ 'approved', 'rejected', 'cancelled', 'pending' ].includes(status)) return status;
    throw new AppError('DEST-012', 400);
  }

  private toPublicDestination(destination: any) {
    return {
      id: destination.id,
      name: destination.name,
      slug: destination.slug,
      city: destination.city || null,
      state: destination.state || null,
      description: destination.description || null,
      heroTitle: destination.heroTitle || null,
      heroSubtitle: destination.heroSubtitle || null,
      logoUrl: destination.logoUrl || null,
      bannerUrl: destination.bannerUrl || null,
      lat: destination.lat != null ? Number(destination.lat) : null,
      lng: destination.lng != null ? Number(destination.lng) : null,
      active: destination.active !== false,
      sortOrder: Number(destination.sortOrder || 0),
    };
  }

  private toPublicBanner(banner: any) {
    return {
      id: banner.id,
      destinationId: banner.destinationId,
      title: banner.title,
      subtitle: banner.subtitle || null,
      imageUrl: banner.imageUrl || null,
      actionType: banner.actionType || null,
      actionTarget: banner.actionTarget || null,
      active: banner.active !== false,
      sortOrder: Number(banner.sortOrder || 0),
    };
  }

  private toPublicPlace(place: any) {
    return {
      id: place.id,
      destinationId: place.destinationId,
      name: place.name,
      slug: place.slug,
      type: place.type || 'CHALE',
      description: place.description || null,
      address: place.address || null,
      addressNumber: place.addressNumber || null,
      district: place.district || null,
      city: place.city || null,
      state: place.state || null,
      zipCode: place.zipCode || null,
      lat: place.lat != null ? Number(place.lat) : null,
      lng: place.lng != null ? Number(place.lng) : null,
      geoSource: place.geoSource || 'unknown',
      geoPrecision: place.geoPrecision || 'unknown',
      geoVerified: place.geoVerified === true,
      geoApproximate: isApproximateGeoPrecision(place.geoPrecision),
      geocodedAt: place.geocodedAt || null,
      formattedAddress: place.formattedAddress || null,
      phone: place.phone || null,
      whatsapp: place.whatsapp || null,
      instagramUrl: place.instagramUrl || null,
      websiteUrl: place.websiteUrl || null,
      logoUrl: place.logoUrl || null,
      bannerUrl: place.bannerUrl || null,
      bannerUrls: normalizeHospitalityBannerUrls(place.bannerUrls, place.bannerUrl),
      amenities: Array.isArray(place.amenities) ? place.amenities : [],
      deliveryInstructions: place.deliveryInstructions || null,
      active: place.active !== false,
      sortOrder: Number(place.sortOrder || 0),
    };
  }

  private toPublicStoreLink(link: any) {
    return {
      id: link?.id || null,
      hospitalityPlaceId: link?.hospitalityPlaceId || null,
      storeId: link?.storeId || link?.store?.id || null,
      deliveryEnabled: link?.deliveryEnabled !== false,
      pickupEnabled: link?.pickupEnabled === true,
      deliveryFee: link?.deliveryFee != null ? Number(link.deliveryFee) : null,
      estimatedMinutes: link?.estimatedMinutes != null ? Number(link.estimatedMinutes) : null,
      notes: link?.notes || null,
      recommended: link?.recommended === true,
      active: link?.active !== false,
      store: link?.store ? this.toPublicStoreSummary(link.store) : null,
    };
  }

  private async withListingHospitalityPlaces(listings: any[]) {
    const items = Array.isArray(listings) ? listings.filter(Boolean) : [];
    const ids = items.map((listing) => String(listing?.id || '')).filter(Boolean);
    if (!ids.length) return items;
    const links = await this.repository.listListingPlaceLinksByListingIds(ids);
    const linksByListing = links.reduce((acc, link: any) => {
      const listingId = String(link.listingId || '');
      if (!acc.has(listingId)) acc.set(listingId, []);
      acc.get(listingId)?.push(link);
      return acc;
    }, new Map<string, any[]>());
    return items.map((listing) => ({
      ...listing,
      hospitalityPlaceLinks: linksByListing.get(String(listing.id)) || listing.hospitalityPlaceLinks || [],
    }));
  }

  private listingHospitalityPlaceLinks(listing: any) {
    const links = Array.isArray(listing?.hospitalityPlaceLinks) ? listing.hospitalityPlaceLinks : [];
    return [...links].sort((left: any, right: any) => {
      const sortDiff = Number(left?.sortOrder ?? 0) - Number(right?.sortOrder ?? 0);
      if (sortDiff !== 0) return sortDiff;
      return String(left?.createdAt || '').localeCompare(String(right?.createdAt || ''));
    });
  }

  private listingHospitalityPlaceIds(listing: any) {
    const linkedIds = this.listingHospitalityPlaceLinks(listing)
      .map((link: any) => toOptionalText(link?.hospitalityPlaceId || link?.hospitalityPlace?.id))
      .filter(Boolean);
    const legacyId = toOptionalText(listing?.hospitalityPlaceId);
    return Array.from(new Set([ ...linkedIds, legacyId ].filter(Boolean))) as string[];
  }

  private listingHospitalityPlaces(listing: any) {
    const linkedPlaces = this.listingHospitalityPlaceLinks(listing)
      .map((link: any) => link?.hospitalityPlace)
      .filter(Boolean);
    const legacyPlace = listing?.hospitalityPlace || null;
    const byId = new Map<string, any>();
    [ ...linkedPlaces, legacyPlace ].filter(Boolean).forEach((place: any) => {
      const id = String(place?.id || '');
      if (id && !byId.has(id)) byId.set(id, place);
    });
    return Array.from(byId.values());
  }

  private listingAppliesToHospitalityPlace(listing: any, placeId: string) {
    const placeIds = this.listingHospitalityPlaceIds(listing);
    return placeIds.length === 0 || placeIds.includes(String(placeId));
  }

  private listingSortOrderForHospitalityPlace(listing: any, placeId: string) {
    const link = this.listingHospitalityPlaceLinks(listing).find((item: any) =>
      String(item?.hospitalityPlaceId || item?.hospitalityPlace?.id || '') === String(placeId)
    );
    if (link) {
      const sortOrder = Number(link.sortOrder ?? 0);
      return Number.isFinite(sortOrder) ? sortOrder : 0;
    }
    const sortOrder = Number(listing?.sortOrder ?? 0);
    return Number.isFinite(sortOrder) ? sortOrder : 0;
  }

  private compareHospitalityListings(left: any, right: any, placeId: string) {
    const featuredDiff = Number(right?.featured === true) - Number(left?.featured === true);
    if (featuredDiff !== 0) return featuredDiff;
    const placeSortDiff = this.listingSortOrderForHospitalityPlace(left, placeId) - this.listingSortOrderForHospitalityPlace(right, placeId);
    if (placeSortDiff !== 0) return placeSortDiff;
    const listingSortDiff = Number(left?.sortOrder ?? 0) - Number(right?.sortOrder ?? 0);
    if (listingSortDiff !== 0) return listingSortDiff;
    return String(left?.title || '').localeCompare(String(right?.title || ''), 'pt-BR');
  }

  private toPublicListing(listing: any) {
    const hospitalityPlaceIds = this.listingHospitalityPlaceIds(listing);
    const hospitalityPlaces = this.listingHospitalityPlaces(listing);
    const hospitalityPlaceLinks = this.listingHospitalityPlaceLinks(listing);
    return {
      id: listing.id,
      destinationId: listing.destinationId,
      hospitalityPlaceId: hospitalityPlaceIds[0] || null,
      hospitalityPlaceIds,
      storeId: listing.storeId || null,
      category: listing.category || 'SERVICO',
      title: listing.title,
      description: listing.description || null,
      imageUrl: listing.imageUrl || null,
      address: listing.address || null,
      addressNumber: listing.addressNumber || null,
      district: listing.district || null,
      city: listing.city || null,
      state: listing.state || null,
      zipCode: listing.zipCode || null,
      lat: listing.lat != null ? Number(listing.lat) : null,
      lng: listing.lng != null ? Number(listing.lng) : null,
      geoSource: listing.geoSource || 'unknown',
      geoPrecision: listing.geoPrecision || 'unknown',
      geoVerified: listing.geoVerified === true,
      geoApproximate: isApproximateGeoPrecision(listing.geoPrecision),
      geocodedAt: listing.geocodedAt || null,
      formattedAddress: listing.formattedAddress || null,
      phone: listing.phone || null,
      whatsapp: listing.whatsapp || null,
      instagramUrl: listing.instagramUrl || null,
      websiteUrl: listing.websiteUrl || null,
      ctaType: listing.ctaType || null,
      ctaUrl: listing.ctaUrl || null,
      featured: listing.featured === true,
      active: listing.active !== false,
      sortOrder: Number(listing.sortOrder || 0),
      store: listing.store ? this.toPublicStoreSummary(listing.store) : null,
      hospitalityPlace: listing.hospitalityPlace ? this.toPublicPlace(listing.hospitalityPlace) : null,
      hospitalityPlaceLinks: hospitalityPlaceLinks.map((link: any) => ({
        id: link.id || null,
        hospitalityPlaceId: link.hospitalityPlaceId || link.hospitalityPlace?.id || null,
        sortOrder: Number(link.sortOrder || 0),
        hospitalityPlace: link.hospitalityPlace ? this.toPublicPlace(link.hospitalityPlace) : null,
      })),
      hospitalityPlaces: hospitalityPlaces.map((place) => this.toPublicPlace(place)),
      destination: listing.destination ? this.toPublicDestination(listing.destination) : null,
    };
  }

  private toPublicPartnerRequest(request: any) {
    const requestedHospitalityPlaces = (Array.isArray(request?.requestedStoreRequests) ? request.requestedStoreRequests : [])
      .map((item: any) => item?.hospitalityPlace)
      .filter(Boolean);
    const requestedPlaceIdsFromAttribution = Array.isArray(request?.store?.settings?.acquisitionAttribution?.destinationHospitalityPlaceIds)
      ? request.store.settings.acquisitionAttribution.destinationHospitalityPlaceIds
      : [];
    const requestedPlaceNamesFromAttribution = Array.isArray(request?.store?.settings?.acquisitionAttribution?.destinationHospitalityPlaceNames)
      ? request.store.settings.acquisitionAttribution.destinationHospitalityPlaceNames
      : [];
    return {
      id: request.id,
      destinationId: request.destinationId,
      partnerType: request.partnerType || 'HOSPITALITY',
      placeType: request.placeType || null,
      category: request.category || null,
      name: request.name,
      slug: request.slug || null,
      description: request.description || null,
      address: request.address || null,
      city: request.city || null,
      state: request.state || null,
      zipCode: request.zipCode || null,
      phone: request.phone || null,
      whatsapp: request.whatsapp || null,
      instagramUrl: request.instagramUrl || null,
      websiteUrl: request.websiteUrl || null,
      logoUrl: request.logoUrl || null,
      bannerUrl: request.bannerUrl || null,
      imageUrl: request.imageUrl || null,
      deliveryInstructions: request.deliveryInstructions || null,
      requestSource: request.requestSource || null,
      claimedHospitalityPlaceId: request.claimedHospitalityPlaceId || null,
      claimedListingId: request.claimedListingId || null,
      storeId: request.storeId || null,
      store: request.store ? this.toPublicStoreSummary(request.store) : null,
      claimedHospitalityPlace: request.claimedHospitalityPlace ? {
        id: request.claimedHospitalityPlace.id,
        name: request.claimedHospitalityPlace.name,
        description: request.claimedHospitalityPlace.description || null,
        address: request.claimedHospitalityPlace.address || null,
        addressNumber: request.claimedHospitalityPlace.addressNumber || null,
        district: request.claimedHospitalityPlace.district || null,
        city: request.claimedHospitalityPlace.city || null,
        state: request.claimedHospitalityPlace.state || null,
        zipCode: request.claimedHospitalityPlace.zipCode || null,
        logoUrl: request.claimedHospitalityPlace.logoUrl || null,
        bannerUrl: request.claimedHospitalityPlace.bannerUrl || null,
        imageUrl: request.claimedHospitalityPlace.imageUrl || request.claimedHospitalityPlace.bannerUrl || request.claimedHospitalityPlace.logoUrl || null,
        whatsapp: request.claimedHospitalityPlace.whatsapp || null,
        phone: request.claimedHospitalityPlace.phone || null,
        instagramUrl: request.claimedHospitalityPlace.instagramUrl || null,
        websiteUrl: request.claimedHospitalityPlace.websiteUrl || null,
      } : null,
      claimedListing: request.claimedListing ? {
        id: request.claimedListing.id,
        title: request.claimedListing.title,
        description: request.claimedListing.description || null,
        address: request.claimedListing.address || null,
        addressNumber: request.claimedListing.addressNumber || null,
        district: request.claimedListing.district || null,
        city: request.claimedListing.city || null,
        state: request.claimedListing.state || null,
        zipCode: request.claimedListing.zipCode || null,
        category: request.claimedListing.category || null,
        imageUrl: request.claimedListing.imageUrl || null,
        logoUrl: request.claimedListing.logoUrl || request.claimedListing.imageUrl || null,
        bannerUrl: request.claimedListing.bannerUrl || request.claimedListing.imageUrl || null,
        whatsapp: request.claimedListing.whatsapp || null,
        phone: request.claimedListing.phone || null,
        instagramUrl: request.claimedListing.instagramUrl || null,
        websiteUrl: request.claimedListing.websiteUrl || null,
      } : null,
      requestedHospitalityPlaces: requestedHospitalityPlaces.map((place: any) => this.toPublicPlace(place)),
      requestedHospitalityPlaceIds: requestedPlaceIdsFromAttribution.map((item: any) => String(item || '').trim()).filter(Boolean),
      requestedHospitalityPlaceNames: requestedPlaceNamesFromAttribution.map((item: any) => String(item || '').trim()).filter(Boolean),
      responsibleName: request.responsibleName,
      responsibleEmail: request.responsibleEmail,
      responsiblePhone: request.responsiblePhone || null,
      message: request.message || null,
      status: request.status || 'pending',
      reviewNote: request.reviewNote || null,
      createdHospitalityPlaceId: request.createdHospitalityPlaceId || null,
      createdListingId: request.createdListingId || null,
      createdPartnerAccountId: request.createdPartnerAccountId || null,
      createdPartnerAccount: request.createdPartnerAccount ? {
        id: request.createdPartnerAccount.id,
        email: request.createdPartnerAccount.email,
        status: request.createdPartnerAccount.status,
        invitedAt: request.createdPartnerAccount.invitedAt instanceof Date ? request.createdPartnerAccount.invitedAt.toISOString() : request.createdPartnerAccount.invitedAt || null,
        activatedAt: request.createdPartnerAccount.activatedAt instanceof Date ? request.createdPartnerAccount.activatedAt.toISOString() : request.createdPartnerAccount.activatedAt || null,
        lastLoginAt: request.createdPartnerAccount.lastLoginAt instanceof Date ? request.createdPartnerAccount.lastLoginAt.toISOString() : request.createdPartnerAccount.lastLoginAt || null,
      } : null,
      partnerActivationToken: request.partnerActivationToken || undefined,
      partnerActivationUrl: request.partnerActivationUrl || undefined,
      partnerInviteSent: request.partnerInviteSent,
      partnerAlreadyActive: request.partnerAlreadyActive,
      partnerLoginUrl: request.partnerLoginUrl || undefined,
      partnerInviteExpiresAt: request.partnerInviteExpiresAt || undefined,
      destination: request.destination ? this.toPublicDestination(request.destination) : null,
      createdAt: request.createdAt instanceof Date ? request.createdAt.toISOString() : request.createdAt,
      reviewedAt: request.reviewedAt instanceof Date ? request.reviewedAt.toISOString() : request.reviewedAt || null,
    };
  }

  private toPublicStoreRequest(request: any) {
    return {
      id: request.id,
      storeId: request.storeId,
      hospitalityPlaceId: request.hospitalityPlaceId,
      status: request.status || 'pending',
      message: request.message || null,
      deliveryEnabled: request.deliveryEnabled !== false,
      pickupEnabled: request.pickupEnabled === true,
      deliveryFee: request.deliveryFee != null ? Number(request.deliveryFee) : null,
      estimatedMinutes: request.estimatedMinutes != null ? Number(request.estimatedMinutes) : null,
      reviewNote: request.reviewNote || null,
      parentPartnerRequestId: request.parentPartnerRequestId || null,
      parentPartnerRequestStatus: request.parentPartnerRequestStatus || null,
      parentPartnerRequestName: request.parentPartnerRequestName || null,
      store: request.store ? this.toPublicStoreSummary(request.store) : null,
      hospitalityPlace: request.hospitalityPlace ? this.toPublicPlace(request.hospitalityPlace) : null,
      destination: request.hospitalityPlace?.destination ? this.toPublicDestination(request.hospitalityPlace.destination) : null,
      createdAt: request.createdAt instanceof Date ? request.createdAt.toISOString() : request.createdAt,
      reviewedAt: request.reviewedAt instanceof Date ? request.reviewedAt.toISOString() : request.reviewedAt || null,
    };
  }

  private toPublicStoreSummary(store: any) {
    return {
      id: store.id,
      name: store.name,
      slug: store.slug,
      open: store.open,
      settings: store.settings
        ? {
            logoUrl: store.settings.logoUrl || null,
            bannerUrl: store.settings.bannerUrl || null,
            description: store.settings.description || null,
            address: store.settings.address || null,
            city: store.settings.city || null,
            state: store.settings.state || null,
            segment: store.settings.segment || 'outros',
            primaryColor: store.settings.primaryColor || null,
            secondaryColor: store.settings.secondaryColor || null,
            isOrderingEnabled: store.settings.isOrderingEnabled !== false,
            orderTypes: Array.isArray(store.settings.orderTypes) ? store.settings.orderTypes : [ 'delivery', 'pickup', 'table' ],
            postalEnabled: Boolean(store.settings.postalEnabled),
          }
        : null,
    };
  }
}
