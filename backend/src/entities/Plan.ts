/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: Plan.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type PlanName =
  | 'basic_monthly'
  | 'pro_monthly'
  | 'basic_yearly'
  | 'pro_yearly'
  | 'founder_basic_monthly'
  | 'founder_pro_monthly'
  | 'founder_basic_yearly'
  | 'founder_pro_yearly'
  | 'monthly'
  | 'yearly'
  | string;

@Entity({ name: 'plans' })
/**
 * Provides Plan functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2025-12-17
 */
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  name!: PlanName;

  @Column({ name: 'display_name', nullable: true })
  displayName?: string;

  @Column('numeric', { precision: 10, scale: 2 })
  price!: number;

  @Column({ name: 'promo_price', type: 'numeric', precision: 10, scale: 2, nullable: true })
  promoPrice?: number | null;

  @Column({ name: 'duration_days', type: 'int' })
  durationDays!: number;

  @Column({ default: true })
  enabled!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
