import { resolvePlanFeatures } from '../config/planFeatures';
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
import {
  MAX_HOSPITALITY_BANNER_IMAGES,
  mergeHospitalityBannerSlots,
  normalizeHospitalityBannerSlots,
  normalizeHospitalityBannerUrls,
} from '../utils/hospitalityMedia';
import { saveBase64Image } from '../utils/imageStorage';
import { logger } from '../utils/logger';
import { GeoLocationService } from './GeoLocationService';
import { OrderReviewService } from './OrderReviewService';
import { SubscriptionService } from './SubscriptionService';
import { ZipCodeLookupResult, ZipCodeLookupService } from './ZipCodeLookupService';

export class DestinationService {
  private repository = new DestinationRepository();
  private subscriptionService = new SubscriptionService();
  private orderReviewService = new OrderReviewService();
  private geoLocationService = new GeoLocationService();
  private zipCodeLookupService = new ZipCodeLookupService();
  private log = logger.child({ scope: 'DestinationService' });

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
    const [banners, places, listings] = await Promise.all([
      this.repository.listBannersByDestinationId(destination.id),
      this.repository.listPlacesByDestinationId(destination.id),
      this.repository.listListingsByDestinationId(destination.id),
    ]);
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
    const [links, listings] = await Promise.all([
      this.repository.listStoreLinksByPlaceId(place.id),
      this.repository.listListingsByDestinationId(destination.id),
    ]);
    const stores = await this.resolvePublicStoreLinks(links);
    return {
      destination: this.toPublicDestination(destination),
      hospitalityPlace: this.toPublicPlace(place),
      stores,
      listings: listings
        .filter((listing) => !listing.hospitalityPlaceId || listing.hospitalityPlaceId === place.id)
        .map((listing) => this.toPublicListing(listing)),
    };
  }

  async createPartnerRequest(payload: any) {
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

    const existing = await this.repository.findPendingPartnerRequestByEmailAndName(responsibleEmail, name, destination.id);
    if (existing) return this.toPublicPartnerRequest(existing);

    const baseSlug = normalizeDestinationSlug(payload?.slug || name) || 'parceiro';
    const logoUrl = await saveBase64Image(payload?.logoFile, `destination-partner-logo-${baseSlug}`, 'destinations');
    const bannerUrl = await saveBase64Image(payload?.bannerFile, `destination-partner-banner-${baseSlug}`, 'destinations');
    const imageUrl = await saveBase64Image(payload?.imageFile, `destination-partner-image-${baseSlug}`, 'destinations');

    const saved = await this.repository.savePartnerRequest({
      destinationId: destination.id,
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
      instagramUrl: toOptionalText(payload?.instagramUrl),
      websiteUrl: toOptionalText(payload?.websiteUrl),
      logoUrl: logoUrl || toOptionalText(payload?.logoUrl),
      bannerUrl: bannerUrl || toOptionalText(payload?.bannerUrl),
      imageUrl: imageUrl || toOptionalText(payload?.imageUrl),
      deliveryInstructions: toOptionalText(payload?.deliveryInstructions),
      responsibleName,
      responsibleEmail,
      responsiblePhone,
      message: toOptionalText(payload?.message),
      status: 'pending',
    });
    return this.toPublicPartnerRequest({ ...saved, destination });
  }

  async adminOverview(query: any = {}) {
    const lite = query?.lite === true || String(query?.lite || '').toLowerCase() === 'true';
    const [destinations, places, listings, partnerRequests, storeRequests, stores] = await Promise.all([
      this.repository.listAllDestinations(),
      this.repository.listAllPlaces(),
      lite ? Promise.resolve([]) : this.repository.listAllListings(),
      this.repository.listPartnerRequests(),
      this.repository.listStoreRequests(),
      this.repository.listAllStoresForAdmin(),
    ]);
    const placeIds = places.map((place) => place.id);
    const allLinks = await this.repository.listStoreLinksByPlaceIds(placeIds, false);
    const linksByPlace = allLinks.reduce((acc, link: any) => {
      const placeId = String(link.hospitalityPlaceId || '');
      if (!acc.has(placeId)) acc.set(placeId, []);
      acc.get(placeId)?.push(link);
      return acc;
    }, new Map<string, any[]>());

    return {
      destinations: destinations.map((destination) => this.toPublicDestination(destination)),
      places: places.map((place) => ({
        ...this.toPublicPlace(place),
        destination: place.destination ? this.toPublicDestination(place.destination) : null,
        storeLinks: (linksByPlace.get(place.id) || []).map((link) => this.toPublicStoreLink(link)),
      })),
      listings: listings.map((listing) => this.toPublicListing(listing)),
      partnerRequests: partnerRequests.map((request) => this.toPublicPartnerRequest(request)),
      storeRequests: storeRequests.map((request) => this.toPublicStoreRequest(request)),
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
    const [listings, total] = await this.repository.listAdminListingsPage(destinationId, {
      page,
      pageSize,
      search,
      status,
      listingCategory,
    });
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
    return [
      toOptionalText(payload.address),
      toOptionalText(payload.addressNumber),
      toOptionalText(payload.district),
      toOptionalText(payload.city),
      this.normalizeStateCode(payload.state),
      this.normalizeZipCode(payload.zipCode),
    ].filter(Boolean).join(', ');
  }

  private uniqueGeocodeCandidates(candidates: Array<string | null | undefined>) {
    const seen = new Set<string>();
    return candidates
      .map((candidate) => String(candidate || '').trim())
      .filter((candidate) => {
        if (!candidate) return false;
        const key = candidate.toLocaleLowerCase('pt-BR');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
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
    const isValidCoordinate = (value?: number | null) =>
      value !== null &&
      value !== undefined &&
      String(value).trim() !== '' &&
      Number.isFinite(Number(value));
    return isValidCoordinate(lat) && isValidCoordinate(lng);
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
    scope: string;
  }) {
    const lat = payload.lat ?? null;
    const lng = payload.lng ?? null;
    if (this.hasCoordinatePair(lat, lng)) return { lat, lng };

    const zipLookup = await this.lookupZipCode(payload.zipCode);
    const baseAddress = this.buildDestinationGeocodeAddress(payload);
    const zipAddress = zipLookup ? this.buildDestinationGeocodeAddress({
      address: zipLookup.street || payload.address,
      addressNumber: payload.addressNumber,
      district: zipLookup.district || payload.district,
      city: zipLookup.city || payload.city,
      state: zipLookup.state || payload.state,
      zipCode: zipLookup.zipCode || payload.zipCode,
    }) : null;
    const zipAddressWithoutCode = zipLookup ? this.buildDestinationGeocodeAddress({
      address: zipLookup.street || payload.address,
      addressNumber: payload.addressNumber,
      district: zipLookup.district || payload.district,
      city: zipLookup.city || payload.city,
      state: zipLookup.state || payload.state,
    }) : null;
    const cityAddress = this.buildDestinationGeocodeAddress({
      address: payload.address,
      addressNumber: payload.addressNumber,
      district: payload.district,
      city: payload.city || zipLookup?.city,
      state: payload.state || zipLookup?.state,
    });
    const candidates = this.uniqueGeocodeCandidates([baseAddress, zipAddress, zipAddressWithoutCode, cityAddress]);

    for (const address of candidates) {
      try {
        const geocoded = await this.geoLocationService.geocodeAddress(address);
        if (geocoded && this.hasCoordinatePair(geocoded.lat, geocoded.lng)) {
          return { lat: Number(geocoded.lat), lng: Number(geocoded.lng) };
        }
      } catch (error) {
        this.log.warn('Destination geocode failed', { scope: payload.scope, address, error });
      }
    }

    if (this.zipLookupHasCoordinates(zipLookup)) {
      return { lat: Number(zipLookup?.latitude), lng: Number(zipLookup?.longitude) };
    }

    return { lat, lng };
  }

  async adminSaveDestination(payload: any, destinationId?: string) {
    const current = destinationId ? await this.repository.findDestinationById(destinationId) : null;
    if (destinationId && !current) throw new AppError('DEST-001', 404);
    const name = String(payload?.name || current?.name || '').trim();
    if (!name) throw new AppError('DEST-004', 400);
    const slug = normalizeDestinationSlug(payload?.slug || current?.slug || name);
    const logoUrl = await saveBase64Image(payload?.logoFile, `destination-logo-${slug}`, 'destinations');
    const bannerUrl = await saveBase64Image(payload?.bannerFile, `destination-banner-${slug}`, 'destinations');
    const hasLogoUrlInput = Object.prototype.hasOwnProperty.call(payload || {}, 'logoUrl');
    const hasBannerUrlInput = Object.prototype.hasOwnProperty.call(payload || {}, 'bannerUrl');
    const saved = await this.repository.saveDestination({
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
    const coordinates = await this.resolveDestinationCoordinates({
      address,
      addressNumber,
      district,
      city,
      state,
      zipCode,
      lat: payload?.lat !== undefined ? toNullableNumber(payload.lat) : current?.lat ?? null,
      lng: payload?.lng !== undefined ? toNullableNumber(payload.lng) : current?.lng ?? null,
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
      phone: payload?.phone !== undefined ? toOptionalText(payload.phone) : current?.phone ?? null,
      whatsapp: payload?.whatsapp !== undefined ? toOptionalText(payload.whatsapp) : current?.whatsapp ?? null,
      instagramUrl: payload?.instagramUrl !== undefined ? toOptionalText(payload.instagramUrl) : current?.instagramUrl ?? null,
      websiteUrl: payload?.websiteUrl !== undefined ? toOptionalText(payload.websiteUrl) : current?.websiteUrl ?? null,
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
    const hasPlaceInput = Object.prototype.hasOwnProperty.call(payload || {}, 'hospitalityPlaceId');
    const placeId = hasPlaceInput ? toOptionalText(payload?.hospitalityPlaceId) : current?.hospitalityPlaceId || null;
    if (placeId) {
      const place = await this.repository.findPlaceById(placeId);
      if (!place || place.destinationId !== destination.id) throw new AppError('DEST-002', 404);
    }
    const hasStoreInput = Object.prototype.hasOwnProperty.call(payload || {}, 'storeId');
    const storeId = hasStoreInput ? toOptionalText(payload?.storeId) : current?.storeId || null;
    if (storeId && !(await this.repository.findStoreById(storeId))) throw new AppError('STORE-001', 404);
    const address = payload?.address !== undefined ? toOptionalText(payload.address) : current?.address ?? null;
    const addressNumber = payload?.addressNumber !== undefined ? toOptionalText(payload.addressNumber) : current?.addressNumber ?? null;
    const district = payload?.district !== undefined ? toOptionalText(payload.district) : current?.district ?? null;
    const city = payload?.city !== undefined ? toOptionalText(payload.city) : current?.city ?? destination.city ?? null;
    const state = payload?.state !== undefined ? this.normalizeStateCode(payload.state) : current?.state ?? destination.state ?? null;
    const zipCode = payload?.zipCode !== undefined ? this.normalizeZipCode(payload.zipCode) : current?.zipCode ?? null;
    const coordinates = await this.resolveDestinationCoordinates({
      address,
      addressNumber,
      district,
      city,
      state,
      zipCode,
      lat: payload?.lat !== undefined ? toNullableNumber(payload.lat) : current?.lat ?? null,
      lng: payload?.lng !== undefined ? toNullableNumber(payload.lng) : current?.lng ?? null,
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
      phone: payload?.phone !== undefined ? toOptionalText(payload.phone) : current?.phone ?? null,
      whatsapp: payload?.whatsapp !== undefined ? toOptionalText(payload.whatsapp) : current?.whatsapp ?? null,
      instagramUrl: payload?.instagramUrl !== undefined ? toOptionalText(payload.instagramUrl) : current?.instagramUrl ?? null,
      websiteUrl: payload?.websiteUrl !== undefined ? toOptionalText(payload.websiteUrl) : current?.websiteUrl ?? null,
      ctaType: payload?.ctaType !== undefined ? toOptionalText(payload.ctaType) : current?.ctaType ?? null,
      ctaUrl: payload?.ctaUrl !== undefined ? toOptionalText(payload.ctaUrl) : current?.ctaUrl ?? null,
      featured: payload?.featured !== undefined ? payload.featured === true : current?.featured === true,
      active: payload?.active !== undefined ? payload.active !== false : current?.active !== false,
      sortOrder: Number(payload?.sortOrder ?? current?.sortOrder ?? 0) || 0,
    });
    const hydrated = await this.repository.findListingById(saved.id);
    return this.toPublicListing({ ...(hydrated || saved), destination: hydrated?.destination || destination });
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

  async adminReviewPartnerRequest(requestId: string, payload: any, reviewedBy?: string) {
    const request = await this.repository.findPartnerRequestById(requestId);
    if (!request) throw new AppError('DEST-010', 404);
    const status = this.normalizeReviewStatus(payload?.status);
    if (status === 'approved' && request.status !== 'approved') {
      if (String(request.partnerType || '').toUpperCase() === 'SERVICE_PROVIDER') {
        const listing = await this.adminSaveListing({
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
        request.createdListingId = listing.id;
        (request as any).createdListing = undefined;
      } else {
        const place = await this.adminSaveHospitalityPlace({
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
        request.createdHospitalityPlaceId = place.id;
        (request as any).createdHospitalityPlace = undefined;
      }
    }
    request.status = status;
    request.reviewNote = toOptionalText(payload?.reviewNote);
    request.reviewedBy = reviewedBy || null;
    request.reviewedAt = new Date();
    const saved = await this.repository.savePartnerRequest(request);
    return this.toPublicPartnerRequest(saved);
  }

  async adminReviewStoreRequest(requestId: string, payload: any, reviewedBy?: string) {
    const request = await this.repository.findStoreRequestById(requestId);
    if (!request) throw new AppError('DEST-011', 404);
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

  private toPublicListing(listing: any) {
    return {
      id: listing.id,
      destinationId: listing.destinationId,
      hospitalityPlaceId: listing.hospitalityPlaceId || null,
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
      destination: listing.destination ? this.toPublicDestination(listing.destination) : null,
    };
  }

  private toPublicPartnerRequest(request: any) {
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
      responsibleName: request.responsibleName,
      responsibleEmail: request.responsibleEmail,
      responsiblePhone: request.responsiblePhone || null,
      message: request.message || null,
      status: request.status || 'pending',
      reviewNote: request.reviewNote || null,
      createdHospitalityPlaceId: request.createdHospitalityPlaceId || null,
      createdListingId: request.createdListingId || null,
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
