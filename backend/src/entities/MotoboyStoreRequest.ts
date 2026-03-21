/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: MotoboyStoreRequest.ts
 * @Date: 2026-01-29
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Motoboy } from './Motoboy';
import { Store } from './Store';
import { User } from './User';
/**
 * Represents motoboy store request entity.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-29
 */
@Entity('motoboy_store_requests')
export class MotoboyStoreRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'motoboy_id' })
  motoboyId!: string;

  @Column({ name: 'store_id' })
  storeId!: string;

  @Column({ default: 'PENDING' })
  status!: string;

  @Column({ name: 'decided_by_user_id', nullable: true })
  decidedByUserId?: string | null;

  @Column({ name: 'reason', type: 'text', nullable: true })
  reason?: string | null;

  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  decidedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => Motoboy)
  @JoinColumn({ name: 'motoboy_id' })
  motoboy?: Motoboy;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'store_id' })
  store?: Store;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'decided_by_user_id' })
  decidedBy?: User;
}
