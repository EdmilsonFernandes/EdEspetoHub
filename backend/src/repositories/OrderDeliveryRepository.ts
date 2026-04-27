/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: OrderDeliveryRepository.ts
 * @Date: 2026-01-29
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { OrderDelivery } from '../entities/OrderDelivery';
/**
 * Provides OrderDeliveryRepository functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2026-01-29
 */
export class OrderDeliveryRepository {
  private repository: Repository<OrderDelivery>;

  /**
   * Creates a new OrderDeliveryRepository.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-29
   */
  constructor() {
    this.repository = AppDataSource.getRepository(OrderDelivery);
  }

  /**
   * Creates data.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-29
   */
  create(data: Partial<OrderDelivery>) {
    return this.repository.create(data);
  }

  /**
   * Saves data.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-29
   */
  save(delivery: OrderDelivery) {
    return this.repository.save(delivery);
  }

  /**
   * Finds by order id.
   *
   * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
   * @date 2026-01-29
   */
  findByOrderId(orderId: string) {
    return this.repository.findOne({ where: { orderId } });
  }
}
