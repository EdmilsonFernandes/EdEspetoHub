/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: CondominiumRepository.ts
 * @Date: 2026-04-12
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Condominium } from '../entities/Condominium';
import { CondominiumEvent } from '../entities/CondominiumEvent';
import { CondominiumEventStore } from '../entities/CondominiumEventStore';
import { Store } from '../entities/Store';
import { StoreCondominium } from '../entities/StoreCondominium';
import { StoreCondominiumRequest } from '../entities/StoreCondominiumRequest';
import { CondominiumUser } from '../entities/CondominiumUser';
import { CondominiumAccessRequest } from '../entities/CondominiumAccessRequest';

/**
 * Provides CondominiumRepository functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-04-12
 */
export class CondominiumRepository {
  private condominiumRepository: Repository<Condominium>;
  private storeCondominiumRepository: Repository<StoreCondominium>;
  private condominiumEventRepository: Repository<CondominiumEvent>;
  private condominiumEventStoreRepository: Repository<CondominiumEventStore>;
  private storeCondominiumRequestRepository: Repository<StoreCondominiumRequest>;
  private condominiumUserRepository: Repository<CondominiumUser>;
  private condominiumAccessRequestRepository: Repository<CondominiumAccessRequest>;

  /**
   * Creates a new instance.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-04-12
   */
  constructor() {
    this.condominiumRepository = AppDataSource.getRepository(Condominium);
    this.storeCondominiumRepository = AppDataSource.getRepository(StoreCondominium);
    this.condominiumEventRepository = AppDataSource.getRepository(CondominiumEvent);
    this.condominiumEventStoreRepository = AppDataSource.getRepository(CondominiumEventStore);
    this.storeCondominiumRequestRepository = AppDataSource.getRepository(StoreCondominiumRequest);
    this.condominiumUserRepository = AppDataSource.getRepository(CondominiumUser);
    this.condominiumAccessRequestRepository = AppDataSource.getRepository(CondominiumAccessRequest);
  }

  async ensureAccessRequestTable() {
    await AppDataSource.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
    await AppDataSource.query(`
      CREATE TABLE IF NOT EXISTS condominium_access_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        condominium_name varchar NOT NULL,
        slug text NULL,
        description text NULL,
        address text NULL,
        city text NULL,
        state text NULL,
        zip_code text NULL,
        logo_url text NULL,
        banner_url text NULL,
        responsible_name varchar NOT NULL,
        responsible_role text NULL,
        responsible_email varchar NOT NULL,
        responsible_phone text NULL,
        message text NULL,
        status text NOT NULL DEFAULT 'pending',
        review_note text NULL,
        reviewed_by uuid NULL,
        reviewed_at timestamptz NULL,
        created_condominium_id uuid NULL REFERENCES condominiums(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await AppDataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_condominium_access_requests_status_created
      ON condominium_access_requests (status, created_at DESC);
    `);
  }

  /**
   * Lists active condominiums.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-04-12
   */
  listActive() {
    return this.condominiumRepository.find({
      where: { active: true },
      order: { name: 'ASC' },
    });
  }

  listAllForAdmin() {
    return this.condominiumRepository.find({
      order: { name: 'ASC' },
    });
  }

  listStoreLinksByCondominiumId(condominiumId: string) {
    return this.storeCondominiumRepository.find({
      where: { condominiumId, active: true },
      relations: [ 'store', 'store.settings' ],
      order: { createdAt: 'DESC' },
    });
  }

  listStoreLinksByCondominiumIds(condominiumIds: string[]) {
    if (!condominiumIds.length) return Promise.resolve([] as StoreCondominium[]);
    return this.storeCondominiumRepository
      .createQueryBuilder('link')
      .innerJoinAndSelect('link.store', 'store')
      .leftJoinAndSelect('store.settings', 'settings')
      .where('link.condominium_id IN (:...condominiumIds)', { condominiumIds })
      .andWhere('link.active = true')
      .orderBy('link.created_at', 'DESC')
      .getMany();
  }

  listCondominiumUsers() {
    return this.condominiumUserRepository.find({
      relations: [ 'condominium' ],
      order: { createdAt: 'DESC' },
    });
  }

  async listAccessRequests(status?: string) {
    await this.ensureAccessRequestTable();
    const qb = this.condominiumAccessRequestRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.createdCondominium', 'createdCondominium')
      .orderBy('request.created_at', 'DESC');
    if (status) qb.andWhere('request.status = :status', { status });
    return qb.getMany();
  }

  async findAccessRequestById(id: string) {
    await this.ensureAccessRequestTable();
    return this.condominiumAccessRequestRepository.findOne({
      where: { id },
      relations: [ 'createdCondominium' ],
    });
  }

  async findPendingAccessRequestByEmailOrName(email: string, condominiumName: string) {
    await this.ensureAccessRequestTable();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedName = String(condominiumName || '').trim();
    return this.condominiumAccessRequestRepository
      .createQueryBuilder('request')
      .where('request.status = :status', { status: 'pending' })
      .andWhere('(LOWER(request.responsible_email) = :email OR LOWER(request.condominium_name) = :name)', {
        email: normalizedEmail,
        name: normalizedName.toLowerCase(),
      })
      .orderBy('request.created_at', 'DESC')
      .getOne();
  }

  async saveAccessRequest(payload: Partial<CondominiumAccessRequest>) {
    await this.ensureAccessRequestTable();
    return this.condominiumAccessRequestRepository.save(this.condominiumAccessRequestRepository.create(payload));
  }

  findCondominiumUserByEmail(email: string) {
    return this.condominiumUserRepository.findOne({ where: { email } });
  }

  saveCondominiumUser(payload: Partial<CondominiumUser>) {
    return this.condominiumUserRepository.save(this.condominiumUserRepository.create(payload));
  }

  /**
   * Finds an active condominium by slug.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-04-12
   */
  findActiveBySlug(slug: string) {
    return this.condominiumRepository.findOne({
      where: { slug, active: true },
    });
  }

  findById(id: string) {
    return this.condominiumRepository.findOne({ where: { id } });
  }

  findEventById(id: string) {
    return this.condominiumEventRepository.findOne({
      where: { id },
      relations: [ 'storeLinks', 'storeLinks.store', 'storeLinks.store.settings', 'condominium' ],
    });
  }

  saveCondominium(payload: Partial<Condominium>) {
    return this.condominiumRepository.save(this.condominiumRepository.create(payload));
  }

  /**
   * Lists active store links for a condominium slug.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-04-12
   */
  listActiveStoreLinksBySlug(slug: string) {
    return this.storeCondominiumRepository
      .createQueryBuilder('link')
      .innerJoinAndSelect('link.condominium', 'condominium')
      .innerJoinAndSelect('link.store', 'store')
      .leftJoinAndSelect('store.settings', 'settings')
      .where('condominium.slug = :slug', { slug })
      .andWhere('condominium.active = true')
      .andWhere('link.active = true')
      .orderBy('store.name', 'ASC')
      .getMany();
  }

  listActiveEventsBySlug(slug: string, from = new Date()) {
    return this.condominiumEventRepository
      .createQueryBuilder('event')
      .innerJoinAndSelect('event.condominium', 'condominium')
      .leftJoinAndSelect('event.storeLinks', 'storeLinks')
      .leftJoinAndSelect('storeLinks.store', 'store')
      .leftJoinAndSelect('store.settings', 'settings')
      .where('condominium.slug = :slug', { slug })
      .andWhere('condominium.active = true')
      .andWhere('event.active = true')
      .andWhere("event.status NOT IN ('cancelled')")
      .andWhere('event.ends_at >= :from', { from })
      .orderBy('event.starts_at', 'ASC')
      .getMany();
  }

  listEventsByCondominiumId(condominiumId: string, from?: Date) {
    const qb = this.condominiumEventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.storeLinks', 'storeLinks')
      .leftJoinAndSelect('storeLinks.store', 'store')
      .leftJoinAndSelect('store.settings', 'settings')
      .where('event.condominium_id = :condominiumId', { condominiumId })
      .andWhere('event.active = true')
      .orderBy('event.starts_at', 'ASC');
    if (from) qb.andWhere('event.ends_at >= :from', { from });
    return qb.getMany();
  }

  listEventsByCondominiumIds(condominiumIds: string[], from?: Date) {
    if (!condominiumIds.length) return Promise.resolve([] as CondominiumEvent[]);
    const qb = this.condominiumEventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.storeLinks', 'storeLinks')
      .leftJoinAndSelect('storeLinks.store', 'store')
      .leftJoinAndSelect('store.settings', 'settings')
      .where('event.condominium_id IN (:...condominiumIds)', { condominiumIds })
      .andWhere('event.active = true')
      .orderBy('event.starts_at', 'ASC');
    if (from) qb.andWhere('event.ends_at >= :from', { from });
    return qb.getMany();
  }

  async getEventSummaryByCondominiumIds(condominiumIds: string[], from = new Date()) {
    if (!condominiumIds.length) return new Map<string, CondominiumEvent>();

    const rows = await this.condominiumEventRepository
      .createQueryBuilder('event')
      .where('event.condominium_id IN (:...condominiumIds)', { condominiumIds })
      .andWhere('event.active = true')
      .andWhere("event.status NOT IN ('cancelled')")
      .andWhere('event.ends_at >= :from', { from })
      .orderBy('event.starts_at', 'ASC')
      .getMany();

    return rows.reduce((acc, event) => {
      if (!acc.has(event.condominiumId)) {
        acc.set(event.condominiumId, event);
      }
      return acc;
    }, new Map<string, CondominiumEvent>());
  }

  listActiveStoreLinksByEventId(eventId: string) {
    return this.condominiumEventStoreRepository
      .createQueryBuilder('eventLink')
      .innerJoinAndSelect('eventLink.event', 'event')
      .innerJoinAndSelect('eventLink.store', 'store')
      .leftJoinAndSelect('store.settings', 'settings')
      .where('event.id = :eventId', { eventId })
      .andWhere('event.active = true')
      .andWhere('eventLink.active = true')
      .orderBy('store.name', 'ASC')
      .getMany();
  }

  saveEvent(payload: Partial<CondominiumEvent>) {
    return this.condominiumEventRepository.save(this.condominiumEventRepository.create(payload));
  }

  async findOverlappingEventForCondominium(condominiumId: string, startsAt: Date, endsAt: Date, excludeEventId?: string) {
    const qb = this.condominiumEventRepository
      .createQueryBuilder('event')
      .where('event.condominium_id = :condominiumId', { condominiumId })
      .andWhere('event.active = true')
      .andWhere("event.status NOT IN ('cancelled')")
      .andWhere('event.starts_at < :endsAt', { endsAt })
      .andWhere('event.ends_at > :startsAt', { startsAt });

    if (excludeEventId) {
      qb.andWhere('event.id <> :excludeEventId', { excludeEventId });
    }

    return qb.orderBy('event.starts_at', 'ASC').getOne();
  }

  async findSameDayEventForCondominium(condominiumId: string, startsAt: Date, excludeEventId?: string) {
    const year = startsAt.getUTCFullYear();
    const month = startsAt.getUTCMonth();
    const day = startsAt.getUTCDate();
    const dayStart = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    const dayEnd = new Date(Date.UTC(year, month, day + 1, 0, 0, 0, 0));

    const qb = this.condominiumEventRepository
      .createQueryBuilder('event')
      .where('event.condominium_id = :condominiumId', { condominiumId })
      .andWhere('event.active = true')
      .andWhere("event.status NOT IN ('cancelled')")
      .andWhere('event.starts_at >= :dayStart', { dayStart })
      .andWhere('event.starts_at < :dayEnd', { dayEnd });

    if (excludeEventId) {
      qb.andWhere('event.id <> :excludeEventId', { excludeEventId });
    }

    return qb.orderBy('event.starts_at', 'ASC').getOne();
  }

  async deactivateCondominium(condominiumId: string) {
    await AppDataSource.query(
      `
        UPDATE condominiums
        SET active = FALSE,
            updated_at = NOW()
        WHERE id = $1;
      `,
      [condominiumId]
    );

    await AppDataSource.query(
      `
        UPDATE condominium_events
        SET active = FALSE,
            status = 'cancelled',
            updated_at = NOW()
        WHERE condominium_id = $1;
      `,
      [condominiumId]
    );

    await AppDataSource.query(
      `
        UPDATE store_condominiums
        SET active = FALSE,
            updated_at = NOW()
        WHERE condominium_id = $1;
      `,
      [condominiumId]
    );

    await AppDataSource.query(
      `
        UPDATE condominium_event_stores ces
        SET active = FALSE,
            updated_at = NOW()
        FROM condominium_events ce
        WHERE ces.event_id = ce.id
          AND ce.condominium_id = $1;
      `,
      [condominiumId]
    );
  }

  async deactivateEvent(eventId: string) {
    await AppDataSource.query(
      `
        UPDATE condominium_events
        SET active = FALSE,
            status = 'cancelled',
            updated_at = NOW()
        WHERE id = $1;
      `,
      [eventId]
    );

    await AppDataSource.query(
      `
        UPDATE condominium_event_stores
        SET active = FALSE,
            updated_at = NOW()
        WHERE event_id = $1;
      `,
      [eventId]
    );
  }

  async upsertStoreCondominium(condominiumId: string, storeId: string, active = true) {
    await AppDataSource.query(
      `
        INSERT INTO store_condominiums (store_id, condominium_id, active, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (store_id, condominium_id) DO UPDATE SET
          active = EXCLUDED.active,
          updated_at = NOW();
      `,
      [storeId, condominiumId, active]
    );
  }

  async updateStoreCondominiumSettings(
    condominiumId: string,
    storeId: string,
    payload: {
      allowPickupAtStall?: boolean;
      allowApartmentDelivery?: boolean;
      apartmentDeliveryFee?: number | null;
    }
  ) {
    await AppDataSource.query(
      `
        UPDATE store_condominiums
        SET allow_pickup_at_stall = COALESCE($3, allow_pickup_at_stall),
            allow_apartment_delivery = COALESCE($4, allow_apartment_delivery),
            apartment_delivery_fee = $5,
            updated_at = NOW()
        WHERE condominium_id = $1
          AND store_id = $2;
      `,
      [
        condominiumId,
        storeId,
        typeof payload.allowPickupAtStall === 'boolean' ? payload.allowPickupAtStall : null,
        typeof payload.allowApartmentDelivery === 'boolean' ? payload.allowApartmentDelivery : null,
        payload.apartmentDeliveryFee ?? null,
      ]
    );
  }

  async upsertEventStore(
    eventId: string,
    storeId: string,
    options: {
      status?: string;
      active?: boolean;
      invitedBy?: string | null;
      inviteNote?: string | null;
    } = {}
  ) {
    const status = String(options.status || 'confirmed').trim().toLowerCase() || 'confirmed';
    const active = typeof options.active === 'boolean' ? options.active : status === 'confirmed';
    await AppDataSource.query(
      `
        INSERT INTO condominium_event_stores (
          event_id,
          store_id,
          active,
          status,
          allow_pickup_at_stall,
          allow_apartment_delivery,
          invited_by,
          invite_note,
          responded_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, TRUE, FALSE, $5, $6, $7, NOW())
        ON CONFLICT (event_id, store_id) DO UPDATE SET
          active = EXCLUDED.active,
          status = EXCLUDED.status,
          allow_pickup_at_stall = TRUE,
          invited_by = COALESCE(EXCLUDED.invited_by, condominium_event_stores.invited_by),
          invite_note = COALESCE(EXCLUDED.invite_note, condominium_event_stores.invite_note),
          responded_at = EXCLUDED.responded_at,
          updated_at = NOW();
      `,
      [
        eventId,
        storeId,
        active,
        status,
        options.invitedBy || null,
        options.inviteNote || null,
        status === 'confirmed' ? new Date() : null,
      ]
    );
  }

  async deactivateStoreCondominium(condominiumId: string, storeId: string) {
    await AppDataSource.query(
      `
        UPDATE store_condominiums
        SET active = FALSE,
            updated_at = NOW()
        WHERE store_id = $1
          AND condominium_id = $2;
      `,
      [storeId, condominiumId]
    );

    await AppDataSource.query(
      `
        UPDATE condominium_event_stores ces
        SET active = FALSE,
            updated_at = NOW()
        FROM condominium_events ce
        WHERE ces.event_id = ce.id
          AND ces.store_id = $1
          AND ce.condominium_id = $2
          AND ce.ends_at >= NOW();
      `,
      [storeId, condominiumId]
    );
  }

  listAllStoresForAdmin() {
    return AppDataSource.getRepository(Store)
      .createQueryBuilder('store')
      .leftJoinAndSelect('store.settings', 'settings')
      .orderBy('store.name', 'ASC')
      .getMany();
  }

  listRequests(status?: string, storeId?: string, condominiumId?: string) {
    const qb = this.storeCondominiumRequestRepository
      .createQueryBuilder('request')
      .innerJoinAndSelect('request.store', 'store')
      .leftJoinAndSelect('store.settings', 'settings')
      .innerJoinAndSelect('request.condominium', 'condominium')
      .orderBy('request.created_at', 'DESC');
    if (status) qb.andWhere('request.status = :status', { status });
    if (storeId) qb.andWhere('request.store_id = :storeId', { storeId });
    if (condominiumId) qb.andWhere('request.condominium_id = :condominiumId', { condominiumId });
    return qb.getMany();
  }

  findRequestById(id: string) {
    return this.storeCondominiumRequestRepository.findOne({
      where: { id },
      relations: [ 'store', 'store.settings', 'condominium' ],
    });
  }

  findRequestByStoreAndCondominium(storeId: string, condominiumId: string) {
    return this.storeCondominiumRequestRepository.findOne({
      where: { storeId, condominiumId },
    });
  }

  saveRequest(payload: Partial<StoreCondominiumRequest>) {
    return this.storeCondominiumRequestRepository.save(this.storeCondominiumRequestRepository.create(payload));
  }

  listStoreLinksByStoreId(storeId: string) {
    return this.storeCondominiumRepository.find({
      where: { storeId },
      relations: [ 'condominium' ],
      order: { createdAt: 'DESC' },
    });
  }
}
