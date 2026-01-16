/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: SubscriptionRepository.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Subscription } from '../entities/Subscription';
/**
 * Provides SubscriptionRepository functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2025-12-17
 */
export class SubscriptionRepository {
  private repository: Repository<Subscription>;
  /**
   * Creates a new instance.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  constructor() {
    this.repository = AppDataSource.getRepository(Subscription);
  }

  /**
   * Creates data.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  create(data: Partial<Subscription>) {
    return this.repository.create(data);
  }

  /**
   * Saves data.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  save(subscription: Subscription) {
    return this.repository.save(subscription);
  }

  /**
   * Handles find latest by store id.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  findLatestByStoreId(storeId: string) {
    return this.repository.findOne({
      where: { store: { id: storeId } },
      order: { endDate: 'DESC' },
      relations: ['store', 'plan'],
    });
  }

  /**
   * Handles find by id.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  findById(id: string) {
    return this.repository.findOne({ where: { id }, relations: ['store', 'plan'] });
  }

  /**
   * Handles find all.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  findAll() {
    return this.repository.find({ relations: ['store', 'plan'] });
  }




  /**
   * Counts subscriptions by status list.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  countByStatuses(statuses: string[])
  {
    return this.repository
      .createQueryBuilder('s')
      .where('s.status IN (:...statuses)', { statuses })
      .getCount();
  }




  /**
   * Counts active subscriptions updated since a date.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  countActiveUpdatedSince(since: Date)
  {
    return this.repository
      .createQueryBuilder('s')
      .where('s.status = :status', { status: 'ACTIVE' })
      .andWhere('s.updated_at >= :since', { since })
      .getCount();
  }




  /**
   * Counts subscriptions started since a date.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  countStartedSince(since: Date)
  {
    return this.repository
      .createQueryBuilder('s')
      .where('s.start_date >= :since', { since })
      .getCount();
  }
}