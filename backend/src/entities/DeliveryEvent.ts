/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * @file: DeliveryEvent.ts
 * @Date: 2026-02-09
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { OrderDelivery } from './OrderDelivery';

@Entity({ name: 'delivery_events' })
export class DeliveryEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'delivery_id' })
  deliveryId!: string;

  @ManyToOne(() => OrderDelivery, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'delivery_id' })
  delivery?: OrderDelivery;

  @Column({ name: 'actor_type', type: 'text' })
  actorType!: string;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId?: string | null;

  @Column({ name: 'from_status', type: 'text', nullable: true })
  fromStatus?: string | null;

  @Column({ name: 'to_status', type: 'text' })
  toStatus!: string;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata?: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

