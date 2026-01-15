/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: Plan.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type PlanName =
  | 'basic_monthly'
  | 'pro_monthly'
  | 'premium_monthly'
  | 'basic_yearly'
  | 'pro_yearly'
  | 'premium_yearly'
  | 'monthly'
  | 'yearly'
  | string;

@Entity({ name: 'plans' })
/**
 * Represents Plan.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2025-12-17
 */
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
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
