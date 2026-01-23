/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: PaymentEventRepository.ts
 * @Date: 2026-01-06
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { PaymentEvent } from '../entities/PaymentEvent';
/**
 * Provides PaymentEventRepository functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-06
 */
export class PaymentEventRepository {
  private repository: Repository<PaymentEvent>;
  /**
   * Creates a new instance.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-06
   */
  constructor() {
    this.repository = AppDataSource.getRepository(PaymentEvent);
  }

  /**
   * Creates data.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-06
   */
  create(data: Partial<PaymentEvent>) {
    return this.repository.create(data);
  }

  /**
   * Saves data.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-06
   */
  save(event: PaymentEvent) {
    return this.repository.save(event);
  }

  /**
   * Handles find recent.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-06
   */
  findRecent(limit = 50, offset = 0) {
    return this.repository.find({
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
      relations: ['payment'],
    });
  }

  /**
   * Handles find by payment id.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-06
   */
  findByPaymentId(paymentId: string, limit = 50, offset = 0) {
    return this.repository.find({
      where: { payment: { id: paymentId } },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
      relations: ['payment'],
    });
  }

  /**
   * Handles find by store id.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-06
   */
  findByStoreId(storeId: string, limit = 50, offset = 0) {
    return this.repository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.payment', 'payment')
      .leftJoinAndSelect('payment.store', 'store')
      .where('store.id = :storeId', { storeId })
      .orderBy('event.createdAt', 'DESC')
      .take(limit)
      .skip(offset)
      .getMany();
  }
}