/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: CondominiumEventStore.ts
 * @Date: 2026-04-13
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
import { CondominiumEvent } from './CondominiumEvent';
import { Store } from './Store';

@Entity({ name: 'condominium_event_stores' })
export class CondominiumEventStore {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => CondominiumEvent, (event) => event.storeLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event!: CondominiumEvent;

  @Column({ name: 'event_id' })
  eventId!: string;

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store!: Store;

  @Column({ name: 'store_id' })
  storeId!: string;

  @Column({ default: true })
  active!: boolean;

  @Column({ name: 'allow_pickup_at_stall', type: 'boolean', default: true })
  allowPickupAtStall!: boolean;

  @Column({ name: 'allow_apartment_delivery', type: 'boolean', default: false })
  allowApartmentDelivery!: boolean;

  @Column('numeric', { name: 'apartment_delivery_fee', precision: 10, scale: 2, nullable: true })
  apartmentDeliveryFee?: number | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
