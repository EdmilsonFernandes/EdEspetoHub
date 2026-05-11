import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { DestinationBanner } from '../entities/DestinationBanner';
import { DestinationListing } from '../entities/DestinationListing';
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
  private partnerRequestRepository: Repository<DestinationPartnerRequest>;
  private storeRequestRepository: Repository<DestinationStoreRequest>;
  private storeRepository: Repository<Store>;

  constructor() {
    this.destinationRepository = AppDataSource.getRepository(TravelDestination);
    this.bannerRepository = AppDataSource.getRepository(DestinationBanner);
    this.placeRepository = AppDataSource.getRepository(HospitalityPlace);
    this.storeLinkRepository = AppDataSource.getRepository(HospitalityPlaceStoreLink);
    this.listingRepository = AppDataSource.getRepository(DestinationListing);
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
      relations: [ 'destination', 'hospitalityPlace', 'store', 'store.settings' ],
    });
  }

  saveListing(payload: Partial<DestinationListing>) {
    return this.listingRepository.save(this.listingRepository.create(payload));
  }

  listPartnerRequests(status?: string) {
    const qb = this.partnerRequestRepository
      .createQueryBuilder('request')
      .innerJoinAndSelect('request.destination', 'destination')
      .leftJoinAndSelect('request.createdHospitalityPlace', 'createdHospitalityPlace')
      .leftJoinAndSelect('request.createdListing', 'createdListing')
      .orderBy('request.created_at', 'DESC');
    if (status) qb.andWhere('request.status = :status', { status });
    return qb.getMany();
  }

  findPartnerRequestById(id: string) {
    return this.partnerRequestRepository.findOne({
      where: { id },
      relations: [ 'destination', 'createdHospitalityPlace', 'createdListing' ],
    });
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

  saveStoreRequest(payload: Partial<DestinationStoreRequest>) {
    return this.storeRequestRepository.save(this.storeRequestRepository.create(payload));
  }

  findStoreById(storeId: string) {
    return this.storeRepository.findOne({ where: { id: storeId }, relations: [ 'settings' ] });
  }

  listAllStoresForAdmin() {
    return this.storeRepository
      .createQueryBuilder('store')
      .leftJoinAndSelect('store.settings', 'settings')
      .orderBy('store.name', 'ASC')
      .getMany();
  }
}
