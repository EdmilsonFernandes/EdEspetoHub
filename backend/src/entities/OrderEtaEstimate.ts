/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: OrderEtaEstimate.ts
 * @Date: 2026-01-28
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from './Order';
import { Store } from './Store';

@Entity({ name: 'order_eta_estimates' })
/**
 * Provides OrderEtaEstimate functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-28
 */
export class OrderEtaEstimate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store!: Store;

  @Column({ name: 'algo_version', type: 'text' })
  algoVersion!: string;

  @Column({ name: 'prep_minutes', type: 'int' })
  prepMinutes!: number;

  @Column({ name: 'queue_minutes', type: 'int' })
  queueMinutes!: number;

  @Column({ name: 'travel_minutes', type: 'int', nullable: true })
  travelMinutes?: number | null;

  @Column({ name: 'buffer_minutes', type: 'int' })
  bufferMinutes!: number;

  @Column({ name: 'total_minutes', type: 'int' })
  totalMinutes!: number;

  @Column({ name: 'window_min', type: 'int' })
  windowMin!: number;

  @Column({ name: 'window_max', type: 'int' })
  windowMax!: number;

  @Column({ name: 'distance_km', type: 'numeric', precision: 10, scale: 2, nullable: true })
  distanceKm?: number | null;

  @Column({ name: 'confidence', type: 'varchar', nullable: true })
  confidence?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

