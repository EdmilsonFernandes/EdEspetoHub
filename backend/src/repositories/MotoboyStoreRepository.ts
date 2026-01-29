/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: MotoboyStoreRepository.ts
 * @Date: 2026-01-29
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { MotoboyStore } from '../entities/MotoboyStore';
/**
 * Provides MotoboyStoreRepository functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-29
 */
export class MotoboyStoreRepository {
  private repository: Repository<MotoboyStore>;

  /**
   * Creates a new MotoboyStoreRepository.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  constructor() {
    this.repository = AppDataSource.getRepository(MotoboyStore);
  }

  /**
   * Creates data.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  create(data: Partial<MotoboyStore>) {
    return this.repository.create(data);
  }

  /**
   * Saves data.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  save(link: MotoboyStore) {
    return this.repository.save(link);
  }

  /**
   * Finds active store link.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  findActiveLink(motoboyId: string, storeId: string) {
    return this.repository.findOne({ where: { motoboyId, storeId, active: true } });
  }

  /**
   * Finds link.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  findLink(motoboyId: string, storeId: string) {
    return this.repository.findOne({ where: { motoboyId, storeId } });
  }

  /**
   * Lists store ids for motoboy.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-29
   */
  async listStoreIds(motoboyId: string) {
    const rows = await this.repository.find({ where: { motoboyId, active: true } });
    return rows.map((row) => row.storeId);
  }
}
