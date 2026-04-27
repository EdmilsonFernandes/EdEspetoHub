/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: StoreCondominium.ts
 * @Date: 2026-04-12
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
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
import { Condominium } from './Condominium';
import { Store } from './Store';

@Entity({ name: 'store_condominiums' })
/**
 * Provides StoreCondominium functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2026-04-12
 */
export class StoreCondominium {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store!: Store;

  @Column({ name: 'store_id' })
  storeId!: string;

  @ManyToOne(() => Condominium, (condominium) => condominium.storeLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'condominium_id' })
  condominium!: Condominium;

  @Column({ name: 'condominium_id' })
  condominiumId!: string;

  @Column({ default: true })
  active!: boolean;

  @Column({
    type: 'jsonb',
    nullable: true,
    default: () => "'[]'::jsonb",
    transformer: {
      to: (value?: unknown[] | null) => (Array.isArray(value) ? value : []),
      from: (value: unknown[] | null) => (Array.isArray(value) ? value : []),
    },
  })
  schedule?: unknown[];

  @Column({ name: 'pickup_instructions', type: 'text', nullable: true })
  pickupInstructions?: string | null;

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
