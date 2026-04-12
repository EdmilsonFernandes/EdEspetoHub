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

  /**
   * Creates a new instance.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-04-12
   */
  constructor() {
    this.condominiumRepository = AppDataSource.getRepository(Condominium);
    this.storeCondominiumRepository = AppDataSource.getRepository(StoreCondominium);
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
}
