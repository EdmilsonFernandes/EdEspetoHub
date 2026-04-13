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
import { StoreCondominium } from '../entities/StoreCondominium';

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
}
