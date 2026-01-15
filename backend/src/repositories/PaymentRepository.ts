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
 * Represents PaymentRepository.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2025-12-17
 */
export class PaymentRepository {
  private repository: Repository<Payment>;

  /**
   * Creates a new PaymentRepository.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  constructor() {
    this.repository = AppDataSource.getRepository(Payment);
  }

  /**
   * Executes create logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  create(data: Partial<Payment>) {
    return this.repository.create(data);
  }

  /**
   * Executes save logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  save(payment: Payment) {
    return this.repository.save(payment);
  }

  /**
   * Executes find by id logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  /**
   * Finds by id.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  findById(id: string) {
    return this.repository.findOne({ where: { id }, relations: ['subscription', 'subscription.plan', 'store', 'user'] });
  }

  /**
   * Executes find latest by store id logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  /**
   * Finds latest by store id.
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
   * Executes find latest pending by store id logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  /**
   * Finds latest pending by store id.
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
   * Executes sum paid amounts logic.
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
   * Counts by status.
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
   * Executes find recent logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  /**
   * Finds recent.
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
   * Counts recent by store id.
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
   * Lists payments by store id.
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
