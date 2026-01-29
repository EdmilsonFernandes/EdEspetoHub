/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: OrderDelivery.ts
 * @Date: 2026-01-29
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { Order } from './Order';
import { Motoboy } from './Motoboy';

@Entity({ name: 'order_deliveries' })
/**
 * Provides OrderDelivery functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-29
 */
export class OrderDelivery {
  @PrimaryColumn('uuid', { name: 'order_id' })
  orderId!: string;

  @OneToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order?: Order;

  @Column({ name: 'motoboy_id' })
  motoboyId!: string;

  @ManyToOne(() => Motoboy, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'motoboy_id' })
  motoboy?: Motoboy;

  @CreateDateColumn({ name: 'assigned_at' })
  assignedAt!: Date;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt?: Date | null;

  @Column({ name: 'payment_confirmed_at', type: 'timestamptz', nullable: true })
  paymentConfirmedAt?: Date | null;

  @Column({ name: 'payment_confirmed_by_motoboy_id', nullable: true })
  paymentConfirmedByMotoboyId?: string | null;

  @ManyToOne(() => Motoboy, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'payment_confirmed_by_motoboy_id' })
  paymentConfirmedByMotoboy?: Motoboy | null;
}
