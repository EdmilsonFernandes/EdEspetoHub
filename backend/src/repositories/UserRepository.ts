/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: UserRepository.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
/**
 * Provides UserRepository functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2025-12-17
 */
export class UserRepository {
  private repository: Repository<User>;
  /**
   * Creates a new instance.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  constructor() {
    this.repository = AppDataSource.getRepository(User);
  }

  /**
   * Creates data.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  create(data: Partial<User>) {
    return this.repository.create(data);
  }

  /**
   * Saves data.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  save(user: User) {
    return this.repository.save(user);
  }

  /**
   * Handles find by email.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  findByEmail(email: string) {
    return this.repository.findOne({ where: { email }, relations: ['stores', 'stores.settings'] });
  }

    /**
   * Retrieves data for find by login identifier.
   *
   * @author Edmilson Lopes
   */
findByLoginIdentifier(identifier: string) {
    const normalized = String(identifier || '').trim().toLowerCase();
    if (!normalized) return Promise.resolve(null);
    return this.repository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.stores', 'store')
      .leftJoinAndSelect('store.settings', 'storeSettings')
      .where('LOWER(user.email) = :identifier', { identifier: normalized })
      .orWhere('LOWER(user.fullName) = :identifier', { identifier: normalized })
      .orderBy('user.createdAt', 'DESC')
      .getOne();
  }

  /**
   * Handles find by id.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2025-12-17
   */
  findById(id: string) {
    return this.repository.findOne({ where: { id }, relations: ['stores', 'stores.settings'] });
  }
}
