/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: StoreLinkHit.ts
 * @Date: 2026-01-22
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Store } from './Store';

@Entity({ name: 'store_link_hits' })
/**
 * Provides StoreLinkHit functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-22
 */
export class StoreLinkHit
{
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'store_id', type: 'uuid' })
  storeId!: string;

  @Column({ name: 'utm_source', type: 'varchar', nullable: true })
  utmSource?: string | null;

  @Column({ name: 'utm_medium', type: 'varchar', nullable: true })
  utmMedium?: string | null;

  @Column({ name: 'utm_campaign', type: 'varchar', nullable: true })
  utmCampaign?: string | null;

  @Column({ name: 'referrer', type: 'text', nullable: true })
  referrer?: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;

  @ManyToOne(() => Store, (store) => store.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store!: Store;
}
