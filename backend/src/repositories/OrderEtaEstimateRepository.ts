/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: OrderEtaEstimateRepository.ts
 * @Date: 2026-01-28
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { OrderEtaEstimate } from '../entities/OrderEtaEstimate';

/**
 * Provides OrderEtaEstimateRepository functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-28
 */
export class OrderEtaEstimateRepository {
  private repository: Repository<OrderEtaEstimate>;

  /**
   * Creates a new OrderEtaEstimateRepository.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-28
   */
  constructor() {
    this.repository = AppDataSource.getRepository(OrderEtaEstimate);
  }

  /**
   * Finds latest estimate by order id.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-28
   */
  findLatestByOrderId(orderId: string) {
    return this.repository.findOne({
      where: { order: { id: orderId } },
      order: { createdAt: 'DESC' },
      relations: [ 'order', 'store' ],
    });
  }

  /**
   * Saves estimate entity.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-28
   */
  save(estimate: OrderEtaEstimate) {
    return this.repository.save(estimate);
  }
}
