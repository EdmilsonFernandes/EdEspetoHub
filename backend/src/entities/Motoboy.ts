/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: Motoboy.ts
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
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './User';

@Entity({ name: 'motoboys' })
/**
 * Provides Motoboy functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-29
 */
export class Motoboy {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', unique: true })
  userId!: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ default: 'PENDING_VERIFICATION' })
  status!: string;

  @Column({ name: 'created_by_user_id', nullable: true })
  createdByUserId?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser?: User | null;

  @Column({ name: 'approved_by_user_id', nullable: true })
  approvedByUserId?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by_user_id' })
  approvedByUser?: User | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
