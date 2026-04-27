/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: MotoboyRepository.ts
 * @Date: 2026-01-29
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Motoboy } from '../entities/Motoboy';
/**
 * Provides MotoboyRepository functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2026-01-29
 */
export class MotoboyRepository {
  private repository: Repository<Motoboy>;

  /**
   * Creates a new MotoboyRepository.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-29
   */
  constructor() {
    this.repository = AppDataSource.getRepository(Motoboy);
  }

  /**
   * Creates data.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-29
   */
  create(data: Partial<Motoboy>) {
    return this.repository.create(data);
  }

  /**
   * Saves data.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-29
   */
  save(motoboy: Motoboy) {
    return this.repository.save(motoboy);
  }

  /**
   * Finds by id.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-29
   */
  findById(id: string) {
    return this.repository.findOne({ where: { id }, relations: ['user'] });
  }

  /**
   * Finds by user id.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-29
   */
  findByUserId(userId: string) {
    return this.repository.findOne({ where: { userId }, relations: ['user'] });
  }
}
