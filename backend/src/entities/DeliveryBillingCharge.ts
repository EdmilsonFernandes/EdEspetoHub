/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: DeliveryBillingCharge.ts
 * @Date: 2026-01-29
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DeliveryBillingCycle } from './DeliveryBillingCycle';
import { Order } from './Order';

/**
 * Provides DeliveryBillingCharge entity.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-29
 */
@Entity({ name: 'delivery_billing_charges' })
export class DeliveryBillingCharge {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => DeliveryBillingCycle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cycle_id' })
  cycle!: DeliveryBillingCycle;

  @Column({ name: 'cycle_id', type: 'uuid' })
  cycleId!: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ name: 'order_id', type: 'uuid', unique: true })
  orderId!: string;

  @Column('numeric', { name: 'delivery_fee', precision: 10, scale: 2, default: 0 })
  deliveryFee!: number;

  @Column('numeric', { name: 'charge_amount', precision: 10, scale: 2, default: 0 })
  chargeAmount!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
