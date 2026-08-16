/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2026 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: Coupon.ts
 * @Date: 2026-08-16
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Store } from './Store';

@Entity({ name: 'coupons' })
@Index('uq_coupons_store_code', ['store', 'code'])
/**
 * Cupom de desconto por loja (benchmark iFood §12: cupom com contagem no checkout).
 * O desconto é SEMPRE reaplicado server-side no createOrder — o front só exibe.
 *
 * @author Edmilson Lopes
 * @date 2026-08-16
 */
export class Coupon {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Store, (store) => store.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store!: Store;

  @Column({ name: 'store_id', type: 'uuid' })
  storeId!: string;

  @Column({ type: 'varchar', length: 40 })
  code!: string;

  /** percent (0-100) ou fixed (BRL) */
  @Column({ name: 'discount_type', type: 'varchar', length: 12, default: 'percent' })
  discountType!: 'percent' | 'fixed';

  @Column({ name: 'discount_value', type: 'numeric', precision: 10, scale: 2 })
  discountValue!: number;

  @Column({ name: 'min_subtotal', type: 'numeric', precision: 10, scale: 2, nullable: true })
  minSubtotal?: number | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt?: Date | null;

  @Column({ name: 'max_uses', type: 'int', nullable: true })
  maxUses?: number | null;

  @Column({ name: 'used_count', type: 'int', default: 0 })
  usedCount?: number;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
