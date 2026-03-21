/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: OrderDeliveryDao.ts
 */

import { Repository, In } from 'typeorm';
import { OrderDelivery } from '../../entities/OrderDelivery';
import { Inject, Provide } from '../../ioc/ioc';
import { Tokens } from '../../ioc/injectiontokens';
import { DatabaseService } from '../data-base.service';
import { GenericDao } from './generic.dao';
import { OrderDeliveryDto } from '../../models/dtos/OrderDeliveryDto';

@Provide(Tokens.Common.DataLayer.OrderDeliveryDao)
export class OrderDeliveryDao extends GenericDao<OrderDeliveryDto, OrderDelivery> {
  constructor() {
    super(OrderDeliveryDto);
  }

  async findByOrderId(orderId: string): Promise<OrderDelivery | null> {
    const repo = await this.getRepository();
    return repo.findOne({ where: { orderId } as any });
  }

  async findActiveByMotoboyId(motoboyId: string): Promise<OrderDelivery[]> {
    const repo = await this.getRepository();
    return repo.find({
      where: {
        motoboyId,
        status: In(['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'])
      } as any
    });
  }

  async expireAvailableDeliveries(): Promise<void> {
    await this.databaseService.dataSource.query(`
      WITH expired AS (
        UPDATE order_deliveries
        SET status = 'EXPIRED'
        WHERE COALESCE(NULLIF(UPPER(status), ''), 'AVAILABLE') = 'AVAILABLE'
          AND motoboy_id IS NULL
          AND expires_at IS NOT NULL
          AND expires_at < NOW()
        RETURNING order_id
      )
      INSERT INTO delivery_events (delivery_id, actor_type, actor_id, from_status, to_status, metadata)
      SELECT order_id, 'SYSTEM', NULL, 'AVAILABLE', 'EXPIRED', jsonb_build_object('reason','expires_at')
      FROM expired
    `);
  }
}
