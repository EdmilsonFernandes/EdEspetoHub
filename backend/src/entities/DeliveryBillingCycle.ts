/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: DeliveryBillingCycle.ts
 * @Date: 2026-01-29
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
import { Store } from './Store';

export type DeliveryBillingStatus = 'OPEN' | 'PENDING_PAYMENT' | 'PAID' | 'OVERDUE';
export type DeliveryPaymentStatus = 'PENDING' | 'PAID' | 'FAILED';

/**
 * Provides DeliveryBillingCycle entity.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-29
 */
@Entity({ name: 'delivery_billing_cycles' })
export class DeliveryBillingCycle {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store!: Store;

  @Column({ name: 'store_id', type: 'uuid' })
  storeId!: string;

  @Column({ name: 'status', type: 'varchar', default: 'OPEN' })
  status!: DeliveryBillingStatus;

  @Column({ name: 'start_date', type: 'timestamptz' })
  startDate!: Date;

  @Column({ name: 'end_date', type: 'timestamptz' })
  endDate!: Date;

  @Column({ name: 'delivery_count', type: 'int', default: 0 })
  deliveryCount!: number;

  @Column('numeric', { name: 'subtotal', precision: 10, scale: 2, default: 0 })
  subtotal!: number;

  @Column('numeric', { name: 'penalty_amount', precision: 10, scale: 2, default: 0 })
  penaltyAmount!: number;

  @Column('numeric', { name: 'total_due', precision: 10, scale: 2, default: 0 })
  totalDue!: number;

  @Column('numeric', { name: 'fee_rate', precision: 6, scale: 4, default: 0.03 })
  feeRate!: number;

  @Column('numeric', { name: 'min_fee', precision: 10, scale: 2, default: 0.5 })
  minFee!: number;

  @Column({ name: 'cycle_days', type: 'int', default: 30 })
  cycleDays!: number;

  @Column('numeric', { name: 'penalty_daily_rate', precision: 6, scale: 4, default: 0.04 })
  penaltyDailyRate!: number;

  @Column('numeric', { name: 'penalty_cap_rate', precision: 6, scale: 4, default: 1 })
  penaltyCapRate!: number;

  @Column({ name: 'payment_method', type: 'varchar', default: 'PIX' })
  paymentMethod!: string;

  @Column({ name: 'payment_status', type: 'varchar', default: 'PENDING' })
  paymentStatus!: DeliveryPaymentStatus;

  @Column({ name: 'provider', type: 'varchar', nullable: true })
  provider?: string | null;

  @Column({ name: 'provider_id', type: 'varchar', nullable: true })
  providerId?: string | null;

  @Column({ name: 'payment_link', type: 'text', nullable: true })
  paymentLink?: string | null;

  @Column({ name: 'qr_code_base64', type: 'text', nullable: true })
  qrCodeBase64?: string | null;

  @Column({ name: 'qr_code_text', type: 'text', nullable: true })
  qrCodeText?: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt?: Date | null;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt?: Date | null;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
