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

import { In, MoreThanOrEqual, Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
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
      relations: [ 'store', 'store.settings', 'store.owner', 'customerUser', 'items', 'items.product', 'shipment' ],
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
   * Finds active occupied tables for a store.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-03-12
   */
  async findActiveTablesByStore(storeId: string, statuses: string[])
  {
    const rows = await this.repository
      .createQueryBuilder('o')
      .select('DISTINCT o.table_number', 'table')
      .where('o.store_id = :storeId', { storeId })
      .andWhere('o.status IN (:...statuses)', { statuses })
      .andWhere('o.table_number IS NOT NULL')
      .andWhere("TRIM(o.table_number) <> ''")
      .orderBy('o.table_number', 'ASC')
      .getRawMany<{ table: string }>();

    return rows
      .map((entry) => String(entry?.table || '').trim())
      .filter(Boolean);
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

  findDashboardQueueByStoreId(
    storeId: string,
    activeStatuses: string[],
    recentStatuses: string[],
    recentSince: Date
  ) {
    const where: any[] = [];
    if (Array.isArray(activeStatuses) && activeStatuses.length > 0) {
      where.push({
        store: { id: storeId },
        status: In(activeStatuses),
      });
    }
    if (Array.isArray(recentStatuses) && recentStatuses.length > 0) {
      where.push({
        store: { id: storeId },
        status: In(recentStatuses),
        createdAt: MoreThanOrEqual(recentSince),
      });
    }

    return this.repository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }




  /**
   * Finds top items since a date.
   *
   * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
   * @date 2026-01-21
   */
  async findTopItemsByStoreSince(storeId: string, since: Date, limit = 3)
  {
    return AppDataSource.getRepository(OrderItem)
      .createQueryBuilder('oi')
      .innerJoin('oi.order', 'o')
      .innerJoin('oi.product', 'p')
      .select('p.id', 'productId')
      .addSelect('p.name', 'name')
      .addSelect('p.image_url', 'imageUrl')
      .addSelect('p.price', 'price')
      .addSelect('SUM(oi.quantity)', 'qty')
      .addSelect('SUM(oi.price)', 'total')
      .where('o.store_id = :storeId', { storeId })
      .andWhere('o.created_at >= :since', { since })
      .andWhere('o.status != :cancelled', { cancelled: 'cancelled' })
      .groupBy('p.id')
      .addGroupBy('p.name')
      .addGroupBy('p.image_url')
      .addGroupBy('p.price')
      .orderBy('qty', 'DESC')
      .limit(limit)
      .getRawMany();
  }

    /**
   * Retrieves data for find top items by store today.
   *
   * @author Edmilson Lopes
   */
async findTopItemsByStoreToday(storeId: string, limit = 3, tz = process.env.APP_TZ || 'America/Sao_Paulo')
  {
    return AppDataSource.getRepository(OrderItem)
      .createQueryBuilder('oi')
      .innerJoin('oi.order', 'o')
      .innerJoin('oi.product', 'p')
      .select('p.id', 'productId')
      .addSelect('p.name', 'name')
      .addSelect('p.image_url', 'imageUrl')
      .addSelect('p.price', 'price')
      .addSelect('SUM(oi.quantity)', 'qty')
      .addSelect('SUM(oi.price)', 'total')
      .where('o.store_id = :storeId', { storeId })
      .andWhere("o.created_at >= (date_trunc('day', now() AT TIME ZONE :tz) AT TIME ZONE :tz)", { tz })
      .andWhere("o.created_at < ((date_trunc('day', now() AT TIME ZONE :tz) + interval '1 day') AT TIME ZONE :tz)", { tz })
      .andWhere('o.status != :cancelled', { cancelled: 'cancelled' })
      .groupBy('p.id')
      .addGroupBy('p.name')
      .addGroupBy('p.image_url')
      .addGroupBy('p.price')
      .orderBy('qty', 'DESC')
      .limit(limit)
      .getRawMany();
  }

    /**
   * Marks workflow state for mark items as printed.
   *
   * @author Edmilson Lopes
   */
async markItemsAsPrinted(orderId: string, itemIds?: string[]) {
    const normalizedIds = Array.isArray(itemIds)
      ? itemIds.map((id) => String(id || '').trim()).filter(Boolean)
      : [];
    const query = AppDataSource.getRepository(OrderItem)
      .createQueryBuilder()
      .update(OrderItem)
      .set({ isPrinted: true })
      .where('order_id = :orderId', { orderId })
      .andWhere('is_printed = false');

    if (normalizedIds.length > 0) {
      query.andWhere('id IN (:...itemIds)', { itemIds: normalizedIds });
    }

    const result = await query.execute();
    return Number(result?.affected || 0);
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
