/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: OrderReview.ts
 * @Date: 2026-02-13
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
import { Order } from './Order';
import { Store } from './Store';
import { Motoboy } from './Motoboy';

@Entity({ name: 'order_reviews' })
export class OrderReview {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id', type: 'uuid', unique: true })
  orderId!: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ name: 'store_id', type: 'uuid' })
  storeId!: string;

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store!: Store;

  @Column({ name: 'motoboy_id', type: 'uuid', nullable: true })
  motoboyId?: string | null;

  @ManyToOne(() => Motoboy, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'motoboy_id' })
  motoboy?: Motoboy | null;

  @Column({ name: 'customer_name', type: 'text', nullable: true })
  customerName?: string | null;

  @Column({ name: 'customer_phone', type: 'text', nullable: true })
  customerPhone?: string | null;

  @Column({ name: 'store_rating', type: 'int' })
  storeRating!: number;

  @Column({ name: 'delivery_rating', type: 'int', nullable: true })
  deliveryRating?: number | null;

  @Column({ name: 'comment', type: 'text', nullable: true })
  comment?: string | null;

  @Column({ name: 'store_tags', type: 'jsonb', default: () => "'[]'" })
  storeTags!: string[];

  @Column({ name: 'delivery_tags', type: 'jsonb', default: () => "'[]'" })
  deliveryTags!: string[];

  @Column('decimal', { name: 'tip_amount', precision: 10, scale: 2, default: 0 })
  tipAmount!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
