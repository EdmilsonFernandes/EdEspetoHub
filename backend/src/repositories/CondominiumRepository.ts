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

  async upsertEventStore(eventId: string, storeId: string) {
    await AppDataSource.query(
      `
        INSERT INTO condominium_event_stores (
          event_id,
          store_id,
          active,
          allow_pickup_at_stall,
          allow_apartment_delivery,
          updated_at
        )
        VALUES ($1, $2, TRUE, TRUE, FALSE, NOW())
        ON CONFLICT (event_id, store_id) DO UPDATE SET
          active = TRUE,
          allow_pickup_at_stall = TRUE,
          updated_at = NOW();
      `,
      [eventId, storeId]
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

  listRequests(status?: string, storeId?: string) {
    const qb = this.storeCondominiumRequestRepository
      .createQueryBuilder('request')
      .innerJoinAndSelect('request.store', 'store')
      .leftJoinAndSelect('store.settings', 'settings')
      .innerJoinAndSelect('request.condominium', 'condominium')
      .orderBy('request.created_at', 'DESC');
    if (status) qb.andWhere('request.status = :status', { status });
    if (storeId) qb.andWhere('request.store_id = :storeId', { storeId });
    return qb.getMany();
  }

  findRequestById(id: string) {
    return this.storeCondominiumRequestRepository.findOne({
      where: { id },
      relations: [ 'store', 'condominium' ],
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
