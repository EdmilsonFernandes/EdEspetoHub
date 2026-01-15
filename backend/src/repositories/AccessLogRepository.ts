/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: AccessLogRepository.ts
 * @Date: 2026-01-15
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { AccessLog } from '../entities/AccessLog';

type AccessLogFilters = {
  role?: string;
  storeId?: string;
  userId?: string;
  method?: string;
  status?: number;
  search?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
};

/**
 * Represents AccessLogRepository.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-15
 */
export class AccessLogRepository {
  private repository: Repository<AccessLog>;

  /**
   * Creates a new AccessLogRepository.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-15
   */
  constructor() {
    this.repository = AppDataSource.getRepository(AccessLog);
  }

  /**
   * Executes save logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-15
   */
  save(payload: Partial<AccessLog>) {
    return this.repository.save(this.repository.create(payload));
  }

  /**
   * Lists access logs with filters.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-15
   */
  async list(filters: AccessLogFilters) {
    const {
      role,
      storeId,
      userId,
      method,
      status,
      search,
      from,
      to,
      limit = 50,
      offset = 0,
    } = filters;

    const query = this.repository.createQueryBuilder('log');

    if (role) query.andWhere('log.role = :role', { role });
    if (storeId) query.andWhere('log.store_id = :storeId', { storeId });
    if (userId) query.andWhere('log.user_id = :userId', { userId });
    if (method) query.andWhere('log.method = :method', { method });
    if (status !== undefined) query.andWhere('log.status = :status', { status });
    if (from) query.andWhere('log.created_at >= :from', { from });
    if (to) query.andWhere('log.created_at <= :to', { to });
    if (search) {
      query.andWhere(
        '(log.path ILIKE :search OR log.user_agent ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    const total = await query.getCount();
    const data = await query
      .orderBy('log.created_at', 'DESC')
      .limit(limit)
      .offset(offset)
      .getMany();

    return { total, data };
  }
}
