/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: PaymentRepository.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Payment } from '../entities/Payment';
/**
 * Provides PaymentRepository functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2025-12-17
 */
export class PaymentRepository {
  private repository: Repository<Payment>;
  /**
   * Creates a new instance.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  constructor() {
    this.repository = AppDataSource.getRepository(Payment);
  }

  /**
   * Creates data.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  create(data: Partial<Payment>) {
    return this.repository.create(data);
  }

  /**
   * Saves data.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  save(payment: Payment) {
    return this.repository.save(payment);
  }

  /**
   * Handles find by id.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  findById(id: string) {
    return this.repository.findOne({ where: { id }, relations: ['subscription', 'subscription.plan', 'store', 'user'] });
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
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Handles find latest pending by store id.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  findLatestPendingByStoreId(storeId: string) {
    return this.repository.findOne({
      where: { store: { id: storeId }, status: 'PENDING' },
      order: { createdAt: 'DESC' },
      relations: ['subscription', 'subscription.plan', 'store', 'user'],
    });
  }

  /**
   * Handles sum paid amounts.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  async sumPaidAmounts() {
    const result = await this.repository
      .createQueryBuilder('payment')
      .select('COALESCE(SUM(payment.amount), 0)', 'sum')
      .where('payment.status = :status', { status: 'PAID' })
      .getRawOne();
    return Number(result?.sum || 0);
  }

  /**
   * Handles count by status.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  async countByStatus(status: string) {
    return this.repository
      .createQueryBuilder('payment')
      .where('payment.status = :status', { status })
      .getCount();
  }

  /**
   * Handles find recent.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  findRecent(limit = 50) {
    return this.repository.find({
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['store', 'subscription', 'subscription.plan', 'user'],
    });
  }

  /**
   * Handles count recent by store id.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  async countRecentByStoreId(storeId: string, since: Date) {
    return this.repository
      .createQueryBuilder('payment')
      .where('payment.store_id = :storeId', { storeId })
      .andWhere('payment.created_at >= :since', { since })
      .getCount();
  }

  /**
   * Handles find by store id.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  findByStoreId(storeId: string, limit = 20) {
    return this.repository.find({
      where: { store: { id: storeId } },
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['subscription', 'subscription.plan', 'store', 'user'],
    });
  }
}