import { In, Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { DestinationBanner } from '../entities/DestinationBanner';
import { DestinationListing } from '../entities/DestinationListing';
import { DestinationListingHospitalityPlace } from '../entities/DestinationListingHospitalityPlace';
import { DestinationPartnerRequest } from '../entities/DestinationPartnerRequest';
import { DestinationStoreRequest } from '../entities/DestinationStoreRequest';
import { HospitalityPlace } from '../entities/HospitalityPlace';
import { HospitalityPlaceStoreLink } from '../entities/HospitalityPlaceStoreLink';
import { Store } from '../entities/Store';
import { TravelDestination } from '../entities/TravelDestination';

export class DestinationRepository {
  private destinationRepository: Repository<TravelDestination>;
  private bannerRepository: Repository<DestinationBanner>;
  private placeRepository: Repository<HospitalityPlace>;
  private storeLinkRepository: Repository<HospitalityPlaceStoreLink>;
  private listingRepository: Repository<DestinationListing>;
  private listingPlaceRepository: Repository<DestinationListingHospitalityPlace>;
  private partnerRequestRepository: Repository<DestinationPartnerRequest>;
  private storeRequestRepository: Repository<DestinationStoreRequest>;
  private storeRepository: Repository<Store>;

  constructor() {
    this.destinationRepository = AppDataSource.getRepository(TravelDestination);
    this.bannerRepository = AppDataSource.getRepository(DestinationBanner);
    this.placeRepository = AppDataSource.getRepository(HospitalityPlace);
    this.storeLinkRepository = AppDataSource.getRepository(HospitalityPlaceStoreLink);
    this.listingRepository = AppDataSource.getRepository(DestinationListing);
    this.listingPlaceRepository = AppDataSource.getRepository(DestinationListingHospitalityPlace);
    this.partnerRequestRepository = AppDataSource.getRepository(DestinationPartnerRequest);
    this.storeRequestRepository = AppDataSource.getRepository(DestinationStoreRequest);
    this.storeRepository = AppDataSource.getRepository(Store);
  }

  listActiveDestinations() {
    return this.destinationRepository.find({
      where: { active: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  listAllDestinations() {
    return this.destinationRepository.find({
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async getAdminDashboardMetrics() {
    const [destinations, places, listings, pendingPartnerRequests, pendingStoreRequests] = await Promise.all([
      this.destinationRepository.count(),
      this.placeRepository.count(),
      this.listingRepository.count(),
      this.partnerRequestRepository.count({ where: { status: 'pending' } }),
      this.storeRequestRepository.count({ where: { status: 'pending' } }),
    ]);
    return {
      destinations,
      places,
      listings,
      pending: pendingPartnerRequests + pendingStoreRequests,
    };
  }

  async listAdminDestinationStates() {
    return this.destinationRepository
      .createQueryBuilder('destination')
      .select("UPPER(SUBSTRING(COALESCE(destination.state, 'UF'), 1, 2))", 'state')
      .addSelect('COUNT(destination.id)', 'count')
      .groupBy("UPPER(SUBSTRING(COALESCE(destination.state, 'UF'), 1, 2))")
      .orderBy('state', 'ASC')
      .getRawMany();
  }

  async listAdminListingCategories(status?: string) {
    const qb = this.listingRepository
      .createQueryBuilder('listing')
      .select("UPPER(COALESCE(listing.category, 'SERVICO'))", 'category')
      .addSelect('COUNT(listing.id)', 'count')
      .groupBy("UPPER(COALESCE(listing.category, 'SERVICO'))")
      .orderBy('category', 'ASC');
    this.applyActiveFilter(qb, 'listing', status);
    return qb.getRawMany();
  }

  async listAdminDestinationsPage(filters: {
    page: number;
    pageSize: number;
    search?: string;
    state?: string;
    status?: string;
    contentType?: string;
    listingCategory?: string;
  }) {
    const qb = this.destinationRepository.createQueryBuilder('destination');
    this.applyDestinationAdminFilters(qb, filters);
    qb
      .orderBy('destination.state', 'ASC')
      .addOrderBy('destination.city', 'ASC')
      .addOrderBy('destination.sortOrder', 'ASC')
      .addOrderBy('destination.name', 'ASC')
      .skip((filters.page - 1) * filters.pageSize)
      .take(filters.pageSize);
    return qb.getManyAndCount();
  }

  async countPlacesByDestinationIds(destinationIds: string[], status?: string) {
    if (!destinationIds.length) return new Map<string, number>();
    const qb = this.placeRepository
      .createQueryBuilder('place')
      .select('place.destination_id', 'destinationId')
      .addSelect('COUNT(place.id)', 'count')
      .where('place.destination_id IN (:...destinationIds)', { destinationIds })
      .groupBy('place.destination_id');
    this.applyActiveFilter(qb, 'place', status);
    const rows = await qb.getRawMany();
    return new Map(rows.map((row: any) => [String(row.destinationId), Number(row.count || 0)]));
  }

  async countListingsByDestinationIds(destinationIds: string[], status?: string, listingCategory?: string) {
    if (!destinationIds.length) return new Map<string, number>();
    const qb = this.listingRepository
      .createQueryBuilder('listing')
      .select('listing.destination_id', 'destinationId')
      .addSelect('COUNT(listing.id)', 'count')
      .where('listing.destination_id IN (:...destinationIds)', { destinationIds })
      .groupBy('listing.destination_id');
    this.applyActiveFilter(qb, 'listing', status);
    const normalizedListingCategory = String(listingCategory || 'all').trim().toUpperCase();
    if (normalizedListingCategory && normalizedListingCategory !== 'ALL') {
      qb.andWhere('UPPER(listing.category) = :listingCategory', { listingCategory: normalizedListingCategory });
    }
    const rows = await qb.getRawMany();
    return new Map(rows.map((row: any) => [String(row.destinationId), Number(row.count || 0)]));
  }

  async listAdminPlacesPage(destinationId: string, filters: { page: number; pageSize: number; search?: string; status?: string }) {
    const qb = this.placeRepository
      .createQueryBuilder('place')
      .leftJoinAndSelect('place.destination', 'destination')
      .where('place.destination_id = :destinationId', { destinationId });
    this.applyActiveFilter(qb, 'place', filters.status);
    const search = String(filters.search || '').trim().toLowerCase();
    if (search) {
      qb.andWhere(
        `LOWER(CONCAT_WS(' ', place.name, place.type, place.address, place.address_number, place.district, place.city, place.state, place.zip_code, place.whatsapp, place.description)) LIKE :search`,
        { search: `%${search}%` }
      );
    }
    qb
      .orderBy('place.sortOrder', 'ASC')
      .addOrderBy('place.name', 'ASC')
      .skip((filters.page - 1) * filters.pageSize)
      .take(filters.pageSize);
    return qb.getManyAndCount();
  }

  async listAdminListingsPage(destinationId: string, filters: { page: number; pageSize: number; search?: string; status?: string; listingCategory?: string }) {
    const qb = this.listingRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.destination', 'destination')
      .leftJoinAndSelect('listing.hospitalityPlace', 'hospitalityPlace')
      .leftJoinAndSelect('listing.store', 'store')
      .leftJoinAndSelect('store.settings', 'settings')
      .where('listing.destination_id = :destinationId', { destinationId });
    this.applyActiveFilter(qb, 'listing', filters.status);
    const normalizedListingCategory = String(filters.listingCategory || 'all').trim().toUpperCase();
    if (normalizedListingCategory && normalizedListingCategory !== 'ALL') {
      qb.andWhere('UPPER(listing.category) = :listingCategory', { listingCategory: normalizedListingCategory });
    }
    const search = String(filters.search || '').trim().toLowerCase();
    if (search) {
      qb.andWhere(
        `LOWER(CONCAT_WS(' ', listing.title, listing.category, listing.address, listing.address_number, listing.district, listing.city, listing.state, listing.zip_code, listing.whatsapp, listing.description, store.name, hospitalityPlace.name)) LIKE :search`,
        { search: `%${search}%` }
      );
    }
    qb
      .orderBy('listing.featured', 'DESC')
      .addOrderBy('listing.sortOrder', 'ASC')
      .addOrderBy('listing.title', 'ASC')
      .skip((filters.page - 1) * filters.pageSize)
      .take(filters.pageSize);
    return qb.getManyAndCount();
  }

  findDestinationById(id: string) {
    return this.destinationRepository.findOne({ where: { id } });
  }

  findDestinationBySlug(slug: string, activeOnly = true) {
    return this.destinationRepository.findOne({
      where: activeOnly ? { slug, active: true } : { slug },
    });
  }

  saveDestination(payload: Partial<TravelDestination>) {
    return this.destinationRepository.save(this.destinationRepository.create(payload));
  }

  listBannersByDestinationId(destinationId: string, activeOnly = true) {
    return this.bannerRepository.find({
      where: activeOnly ? { destinationId, active: true } : { destinationId },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  saveBanner(payload: Partial<DestinationBanner>) {
    return this.bannerRepository.save(this.bannerRepository.create(payload));
  }

  findBannerById(id: string) {
    return this.bannerRepository.findOne({ where: { id } });
  }

  listPlacesByDestinationId(destinationId: string, activeOnly = true) {
    return this.placeRepository.find({
      where: activeOnly ? { destinationId, active: true } : { destinationId },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  listAllPlaces() {
    return this.placeRepository.find({
      relations: [ 'destination' ],
      order: { createdAt: 'DESC' },
    });
  }

  findPlaceById(id: string) {
    return this.placeRepository.findOne({
      where: { id },
      relations: [ 'destination' ],
    });
  }

  findPlacesByIds(ids: string[]) {
    const uniqueIds = Array.from(new Set((ids || []).map((id) => String(id || '').trim()).filter(Boolean)));
    if (!uniqueIds.length) return Promise.resolve([] as HospitalityPlace[]);
    return this.placeRepository.find({
      where: { id: In(uniqueIds) },
      relations: [ 'destination' ],
    });
  }

  findActivePlaceBySlug(destinationId: string, slug: string) {
    return this.placeRepository.findOne({
      where: { destinationId, slug, active: true },
      relations: [ 'destination' ],
    });
  }

  async findPlaceSlugConflict(destinationId: string, slug: string, excludeId?: string) {
    const qb = this.placeRepository
      .createQueryBuilder('place')
      .where('place.destination_id = :destinationId', { destinationId })
      .andWhere('place.slug = :slug', { slug });
    if (excludeId) qb.andWhere('place.id <> :excludeId', { excludeId });
    return qb.getOne();
  }

  savePlace(payload: Partial<HospitalityPlace>) {
    return this.placeRepository.save(this.placeRepository.create(payload));
  }

  listStoreLinksByPlaceId(placeId: string, activeOnly = true) {
    const qb = this.storeLinkRepository
      .createQueryBuilder('link')
      .innerJoinAndSelect('link.store', 'store')
      .leftJoinAndSelect('store.settings', 'settings')
      .where('link.hospitality_place_id = :placeId', { placeId })
      .orderBy('link.recommended', 'DESC')
      .addOrderBy('link.sort_order', 'ASC')
      .addOrderBy('store.name', 'ASC');
    if (activeOnly) qb.andWhere('link.active = true');
    return qb.getMany();
  }

  listStoreLinksByPlaceIds(placeIds: string[], activeOnly = true) {
    if (!placeIds.length) return Promise.resolve([] as HospitalityPlaceStoreLink[]);
    const qb = this.storeLinkRepository
      .createQueryBuilder('link')
      .innerJoinAndSelect('link.store', 'store')
      .leftJoinAndSelect('store.settings', 'settings')
      .where('link.hospitality_place_id IN (:...placeIds)', { placeIds })
      .orderBy('link.recommended', 'DESC')
      .addOrderBy('link.sort_order', 'ASC')
      .addOrderBy('store.name', 'ASC');
    if (activeOnly) qb.andWhere('link.active = true');
    return qb.getMany();
  }

  findStoreLink(placeId: string, storeId: string) {
    return this.storeLinkRepository.findOne({
      where: { hospitalityPlaceId: placeId, storeId },
      relations: [ 'hospitalityPlace', 'store', 'store.settings' ],
    });
  }

  async upsertStoreLink(placeId: string, storeId: string, payload: Partial<HospitalityPlaceStoreLink>) {
    await AppDataSource.query(
      `
        INSERT INTO hospitality_place_store_links (
          hospitality_place_id,
          store_id,
          delivery_enabled,
          pickup_enabled,
          delivery_fee,
          estimated_minutes,
          notes,
          recommended,
          sort_order,
          active,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, NOW())
        ON CONFLICT (hospitality_place_id, store_id) DO UPDATE SET
          delivery_enabled = EXCLUDED.delivery_enabled,
          pickup_enabled = EXCLUDED.pickup_enabled,
          delivery_fee = EXCLUDED.delivery_fee,
          estimated_minutes = EXCLUDED.estimated_minutes,
          notes = EXCLUDED.notes,
          recommended = EXCLUDED.recommended,
          sort_order = EXCLUDED.sort_order,
          active = TRUE,
          updated_at = NOW();
      `,
      [
        placeId,
        storeId,
        payload.deliveryEnabled !== false,
        payload.pickupEnabled === true,
        payload.deliveryFee ?? null,
        payload.estimatedMinutes ?? null,
        payload.notes ?? null,
        payload.recommended === true,
        Number(payload.sortOrder || 0),
      ]
    );
    return this.findStoreLink(placeId, storeId);
  }

  async deactivateStoreLink(placeId: string, storeId: string) {
    await this.storeLinkRepository.update({ hospitalityPlaceId: placeId, storeId }, { active: false });
  }

  listListingsByDestinationId(destinationId: string, activeOnly = true) {
    return this.listingRepository.find({
      where: activeOnly ? { destinationId, active: true } : { destinationId },
      relations: [ 'store', 'store.settings', 'hospitalityPlace' ],
      order: { featured: 'DESC', sortOrder: 'ASC', title: 'ASC' },
    });
  }

  listAllListings() {
    return this.listingRepository.find({
      relations: [ 'destination', 'hospitalityPlace', 'store', 'store.settings' ],
      order: { createdAt: 'DESC' },
    });
  }

  findListingById(id: string) {
    return this.listingRepository.findOne({
      where: { id },
      relations: [
        'destination',
        'hospitalityPlace',
        'hospitalityPlaceLinks',
        'hospitalityPlaceLinks.hospitalityPlace',
        'hospitalityPlaceLinks.hospitalityPlace.destination',
        'store',
        'store.settings',
      ],
    });
  }

  saveListing(payload: Partial<DestinationListing>) {
    return this.listingRepository.save(this.listingRepository.create(payload));
  }

  listListingPlaceLinksByListingIds(listingIds: string[]) {
    const uniqueIds = Array.from(new Set((listingIds || []).map((id) => String(id || '').trim()).filter(Boolean)));
    if (!uniqueIds.length) return Promise.resolve([] as DestinationListingHospitalityPlace[]);
    return this.listingPlaceRepository.find({
      where: { listingId: In(uniqueIds) },
      relations: [ 'hospitalityPlace', 'hospitalityPlace.destination' ],
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async syncListingHospitalityPlaces(
    listingId: string,
    placeLinks: Array<string | { hospitalityPlaceId?: string | null; placeId?: string | null; id?: string | null; sortOrder?: number | string | null }>
  ) {
    const uniqueLinks = new Map<string, number>();
    (placeLinks || []).forEach((item, index) => {
      const placeId = typeof item === 'string'
        ? item
        : String(item?.hospitalityPlaceId || item?.placeId || item?.id || '').trim();
      if (!placeId || uniqueLinks.has(placeId)) return;
      const sortOrder = typeof item === 'string' ? index : Number(item?.sortOrder ?? index);
      uniqueLinks.set(placeId, Number.isFinite(sortOrder) ? sortOrder : index);
    });
    const links = Array.from(uniqueLinks.entries()).map(([hospitalityPlaceId, sortOrder]) => ({ hospitalityPlaceId, sortOrder }));
    await AppDataSource.transaction(async (manager) => {
      await manager.query(
        `DELETE FROM destination_listing_hospitality_places WHERE listing_id = $1`,
        [listingId]
      );
      if (!links.length) return;
      const values = links.map((_, index) => `($1, $${index * 2 + 2}, $${index * 2 + 3})`).join(', ');
      const params = links.flatMap((link) => [link.hospitalityPlaceId, link.sortOrder]);
      await manager.query(
        `
          INSERT INTO destination_listing_hospitality_places (listing_id, hospitality_place_id, sort_order)
          VALUES ${values}
          ON CONFLICT (listing_id, hospitality_place_id)
          DO UPDATE SET sort_order = EXCLUDED.sort_order
        `,
        [listingId, ...params]
      );
    });
  }

  listPartnerRequests(status?: string) {
    const qb = this.partnerRequestRepository
      .createQueryBuilder('request')
      .innerJoinAndSelect('request.destination', 'destination')
      .leftJoinAndSelect('request.createdHospitalityPlace', 'createdHospitalityPlace')
      .leftJoinAndSelect('request.createdListing', 'createdListing')
      .leftJoinAndSelect('request.createdPartnerAccount', 'createdPartnerAccount')
      .leftJoinAndSelect('request.claimedHospitalityPlace', 'claimedHospitalityPlace')
      .leftJoinAndSelect('request.claimedListing', 'claimedListing')
      .leftJoinAndSelect('request.store', 'store')
      .leftJoinAndSelect('store.settings', 'requestStoreSettings')
      .orderBy('request.created_at', 'DESC');
    if (status) qb.andWhere('request.status = :status', { status });
    return qb.getMany();
  }

  findPartnerRequestById(id: string) {
    return this.partnerRequestRepository.findOne({
      where: { id },
      relations: [ 'destination', 'createdHospitalityPlace', 'createdListing', 'createdPartnerAccount', 'claimedHospitalityPlace', 'claimedListing', 'store', 'store.settings' ],
    });
  }

  findPendingPartnerRequestByStoreAndListing(storeId: string, listingId: string) {
    return this.partnerRequestRepository.findOne({
      where: { storeId, claimedListingId: listingId, status: 'pending' },
      relations: [ 'destination', 'claimedListing', 'store', 'store.settings' ],
    });
  }

  findLatestListingClaimRequestByStoreId(storeId: string) {
    return this.partnerRequestRepository
      .createQueryBuilder('request')
      .innerJoinAndSelect('request.destination', 'destination')
      .leftJoinAndSelect('request.claimedListing', 'claimedListing')
      .leftJoinAndSelect('request.store', 'store')
      .leftJoinAndSelect('store.settings', 'requestStoreSettings')
      .where('request.store_id = :storeId', { storeId })
      .andWhere('request.claimed_listing_id IS NOT NULL')
      .andWhere('request.request_source = :source', { source: 'store_signup_destination_claim' })
      .orderBy('request.created_at', 'DESC')
      .getOne();
  }

  findPendingPartnerRequestByEmailAndName(email: string, name: string, destinationId: string) {
    return this.partnerRequestRepository
      .createQueryBuilder('request')
      .where('request.status = :status', { status: 'pending' })
      .andWhere('request.destination_id = :destinationId', { destinationId })
      .andWhere('LOWER(request.responsible_email) = :email', { email: String(email || '').toLowerCase() })
      .andWhere('LOWER(request.name) = :name', { name: String(name || '').toLowerCase() })
      .orderBy('request.created_at', 'DESC')
      .getOne();
  }

  savePartnerRequest(payload: Partial<DestinationPartnerRequest>) {
    return this.partnerRequestRepository.save(this.partnerRequestRepository.create(payload));
  }

  listStoreRequests(status?: string, storeId?: string) {
    const qb = this.storeRequestRepository
      .createQueryBuilder('request')
      .innerJoinAndSelect('request.store', 'store')
      .leftJoinAndSelect('store.settings', 'settings')
      .innerJoinAndSelect('request.hospitalityPlace', 'hospitalityPlace')
      .leftJoinAndSelect('hospitalityPlace.destination', 'destination')
      .orderBy('request.created_at', 'DESC');
    if (status) qb.andWhere('request.status = :status', { status });
    if (storeId) qb.andWhere('request.store_id = :storeId', { storeId });
    return qb.getMany();
  }

  findStoreRequestById(id: string) {
    return this.storeRequestRepository.findOne({
      where: { id },
      relations: [ 'store', 'store.settings', 'hospitalityPlace', 'hospitalityPlace.destination' ],
    });
  }

  findStoreRequestByStoreAndPlace(storeId: string, placeId: string) {
    return this.storeRequestRepository.findOne({
      where: { storeId, hospitalityPlaceId: placeId },
      relations: [ 'hospitalityPlace', 'hospitalityPlace.destination' ],
    });
  }

  listStoreRequestsByStoreAndMessageToken(storeId: string, token: string) {
    return this.storeRequestRepository
      .createQueryBuilder('request')
      .innerJoinAndSelect('request.store', 'store')
      .leftJoinAndSelect('store.settings', 'settings')
      .innerJoinAndSelect('request.hospitalityPlace', 'hospitalityPlace')
      .leftJoinAndSelect('hospitalityPlace.destination', 'destination')
      .where('request.store_id = :storeId', { storeId })
      .andWhere('request.message ILIKE :token', { token: `%${token}%` })
      .orderBy('request.created_at', 'ASC')
      .getMany();
  }

  saveStoreRequest(payload: Partial<DestinationStoreRequest>) {
    return this.storeRequestRepository.save(this.storeRequestRepository.create(payload));
  }

  findStoreById(storeId: string) {
    return this.storeRepository.findOne({ where: { id: storeId }, relations: [ 'settings' ] });
  }

  saveStore(store: Store) {
    return this.storeRepository.save(store);
  }

  listAllStoresForAdmin() {
    return this.storeRepository
      .createQueryBuilder('store')
      .leftJoinAndSelect('store.settings', 'settings')
      .orderBy('store.name', 'ASC')
      .getMany();
  }

  private applyDestinationAdminFilters(qb: any, filters: { search?: string; state?: string; status?: string; contentType?: string; listingCategory?: string }) {
    const requestedState = String(filters.state || 'all').trim();
    const state = requestedState.toLowerCase() === 'all' ? '' : requestedState.toUpperCase().slice(0, 2);
    if (state) {
      qb.andWhere('UPPER(SUBSTRING(COALESCE(destination.state, :fallbackState), 1, 2)) = :state', {
        fallbackState: 'UF',
        state,
      });
    }

    const search = String(filters.search || '').trim().toLowerCase();
    const contentType = String(filters.contentType || 'all').toLowerCase();
    const listingCategory = String(filters.listingCategory || 'all').toUpperCase();
    const searchParam = `%${search}%`;
    const destinationStatusSql = this.activeConditionSql('destination', filters.status);
    const inactiveCatalog = String(filters.status || 'active').toLowerCase() === 'inactive';

    if (contentType === 'places') {
      const placeExistsSql = this.adminPlaceExistsSql(Boolean(search), filters.status);
      if (inactiveCatalog && destinationStatusSql) {
        qb.andWhere(`(${destinationStatusSql} OR ${placeExistsSql})`, { search: searchParam });
      } else {
        if (destinationStatusSql) qb.andWhere(destinationStatusSql);
        qb.andWhere(placeExistsSql, { search: searchParam });
      }
      return;
    }
    if (contentType === 'listings') {
      const listingExistsSql = this.adminListingExistsSql(Boolean(search), listingCategory !== 'ALL', filters.status);
      if (inactiveCatalog && destinationStatusSql) {
        qb.andWhere(`(${destinationStatusSql} OR ${listingExistsSql})`, {
          search: searchParam,
          listingCategory,
        });
      } else {
        if (destinationStatusSql) qb.andWhere(destinationStatusSql);
        qb.andWhere(listingExistsSql, {
          search: searchParam,
          listingCategory,
        });
      }
      return;
    }

    if (!search) {
      if (inactiveCatalog && destinationStatusSql) {
        qb.andWhere(
          `(
            ${destinationStatusSql}
            OR ${this.adminPlaceExistsSql(false, filters.status)}
            OR ${this.adminListingExistsSql(false, listingCategory !== 'ALL', filters.status)}
          )`,
          { listingCategory }
        );
      } else if (destinationStatusSql) {
        qb.andWhere(destinationStatusSql);
      }
      return;
    }

    if (inactiveCatalog && destinationStatusSql) {
      qb.andWhere(
        `(
          (${destinationStatusSql} AND LOWER(CONCAT_WS(' ', destination.name, destination.city, destination.state, destination.description, destination.hero_title, destination.hero_subtitle)) LIKE :search)
          OR ${this.adminPlaceExistsSql(true, filters.status)}
          OR ${this.adminListingExistsSql(true, listingCategory !== 'ALL', filters.status)}
        )`,
        { search: searchParam, listingCategory }
      );
      return;
    }

    if (destinationStatusSql) qb.andWhere(destinationStatusSql);
    qb.andWhere(
      `(
        LOWER(CONCAT_WS(' ', destination.name, destination.city, destination.state, destination.description, destination.hero_title, destination.hero_subtitle)) LIKE :search
        OR ${this.adminPlaceExistsSql(true, filters.status)}
        OR ${this.adminListingExistsSql(true, listingCategory !== 'ALL', filters.status)}
      )`,
      { search: searchParam, listingCategory }
    );
  }

  private applyActiveFilter(qb: any, alias: string, status?: string) {
    const condition = this.activeConditionSql(alias, status);
    if (condition) qb.andWhere(condition);
  }

  private activeConditionSql(alias: string, status?: string) {
    const normalized = String(status || 'active').toLowerCase();
    if (normalized === 'inactive') return `${alias}.active = false`;
    if (normalized === 'active') return `${alias}.active = true`;
    return '';
  }

  private adminPlaceExistsSql(withSearch: boolean, status?: string) {
    return `EXISTS (
      SELECT 1 FROM hospitality_places place_filter
      WHERE place_filter.destination_id = destination.id
      ${this.activeExistsSql('place_filter', status)}
      ${withSearch ? "AND LOWER(CONCAT_WS(' ', place_filter.name, place_filter.type, place_filter.address, place_filter.address_number, place_filter.district, place_filter.city, place_filter.state, place_filter.zip_code, place_filter.whatsapp, place_filter.description)) LIKE :search" : ''}
    )`;
  }

  private adminListingExistsSql(withSearch: boolean, withCategory: boolean, status?: string) {
    return `EXISTS (
      SELECT 1 FROM destination_listings listing_filter
      LEFT JOIN stores store_filter ON store_filter.id = listing_filter.store_id
      LEFT JOIN hospitality_places hospitality_filter ON hospitality_filter.id = listing_filter.hospitality_place_id
      WHERE listing_filter.destination_id = destination.id
      ${this.activeExistsSql('listing_filter', status)}
      ${withCategory ? 'AND UPPER(listing_filter.category) = :listingCategory' : ''}
      ${withSearch ? "AND LOWER(CONCAT_WS(' ', listing_filter.title, listing_filter.category, listing_filter.address, listing_filter.address_number, listing_filter.district, listing_filter.city, listing_filter.state, listing_filter.zip_code, listing_filter.whatsapp, listing_filter.description, store_filter.name, hospitality_filter.name)) LIKE :search" : ''}
    )`;
  }

  private activeExistsSql(alias: string, status?: string) {
    const normalized = String(status || 'active').toLowerCase();
    if (normalized === 'inactive') return `AND ${alias}.active = false`;
    if (normalized === 'active') return `AND ${alias}.active = true`;
    return '';
  }
}
