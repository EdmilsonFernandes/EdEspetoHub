/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: OrderRepository.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Order } from '../entities/Order';
/**
 * Provides OrderRepository functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2025-12-17
 */
export class OrderRepository
{
  private repository: Repository<Order>;

  /**
   * Creates a new OrderRepository.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  constructor()
  {
    this.repository = AppDataSource.getRepository(Order);
  }




  /**
   * Executes create logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  create(data: Partial<Order>)
  {
    return this.repository.create(data);
  }




  /**
   * Executes save logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  save(order: Order)
  {
    return this.repository.save(order);
  }




  /**
   * Executes find by store id logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  /**
   * Finds by store id.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  findByStoreId(storeId: string)
  {
    return this.repository.find({
      where: { store: { id: storeId } },
      order: { createdAt: 'DESC' },
    });
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
  findById(orderId: string)
  {
    return this.repository.findOne({
      where: { id: orderId },
      relations: [ 'store', 'store.owner', 'items', 'items.product' ],
    });
  }




  /**
   * Counts by store and statuses.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  countByStoreAndStatuses(storeId: string, statuses: string[])
  {
    return this.repository
      .createQueryBuilder('o')
      .where('o.store_id = :storeId', { storeId })
      .andWhere('o.status IN (:...statuses)', { statuses })
      .getCount();
  }




  /**
   * Counts queue ahead.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  countQueueAhead(storeId: string, statuses: string[], createdAt: Date)
  {
    return this.repository
      .createQueryBuilder('o')
      .where('o.store_id = :storeId', { storeId })
      .andWhere('o.status IN (:...statuses)', { statuses })
      .andWhere('o.created_at <= :createdAt', { createdAt })
      .getCount();
  }




  /**
   * Counts active orders for a table.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-17
   */
  countActiveByTable(storeId: string, tableNumber: string, statuses: string[])
  {
    return this.repository
      .createQueryBuilder('o')
      .where('o.store_id = :storeId', { storeId })
      .andWhere('o.status IN (:...statuses)', { statuses })
      .andWhere('o.table_number = :tableNumber', { tableNumber })
      .getCount();
  }




  /**
   * Executes find queue by store id logic.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  /**
   * Finds queue by store id.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  findQueueByStoreId(storeId: string)
  {
    return this.repository.find({
      where: { store: { id: storeId }, status: 'pending' },
      order: { createdAt: 'ASC' },
    });
  }




  /**
   * Counts all orders.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  countAll()
  {
    return this.repository.count();
  }




  /**
   * Counts orders since a date.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  countSince(since: Date)
  {
    return this.repository
      .createQueryBuilder('o')
      .where('o.created_at >= :since', { since })
      .getCount();
  }




  /**
   * Aggregates orders by store.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  async aggregateByStore()
  {
    const rows = await this.repository
      .createQueryBuilder('o')
      .select('o.store_id', 'storeId')
      .addSelect('COUNT(*)', 'ordersCount')
      .addSelect('COALESCE(SUM(o.total), 0)', 'ordersRevenue')
      .addSelect('MAX(o.created_at)', 'lastOrderAt')
      .groupBy('o.store_id')
      .getRawMany();

    return rows.map((row) => ({
      storeId: row.storeId,
      ordersCount: Number(row.ordersCount || 0),
      ordersRevenue: Number(row.ordersRevenue || 0),
      lastOrderAt: row.lastOrderAt,
    }));
  }




  /**
   * Sums total revenue from orders.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  async sumAllRevenue()
  {
    const row = await this.repository
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.total), 0)', 'sum')
      .getRawOne();
    return Number(row?.sum || 0);
  }




  /**
   * Sums revenue from orders since a date.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2025-12-17
   */
  async sumRevenueSince(since: Date)
  {
    const row = await this.repository
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.total), 0)', 'sum')
      .where('o.created_at >= :since', { since })
      .getRawOne();
    return Number(row?.sum || 0);
  }
}
