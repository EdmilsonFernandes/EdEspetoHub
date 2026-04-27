/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: Product.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Store } from './Store';
import { OrderItem } from './OrderItem';

@Entity({ name: 'products' })
/**
 * Provides Product functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2025-12-17
 */
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price!: number;

  @Column('decimal', { precision: 10, scale: 2, name: 'promo_price', nullable: true })
  promoPrice?: number | null;

  @Column({ name: 'promo_active', default: false })
  promoActive!: boolean;

  @Column({ name: 'bundle_promo_qty', type: 'int', nullable: true })
  bundlePromoQty?: number | null;

  @Column('decimal', { precision: 10, scale: 2, name: 'bundle_promo_price', nullable: true })
  bundlePromoPrice?: number | null;

  @Column({ name: 'bundle_promo_active', default: false })
  bundlePromoActive!: boolean;

  @Column({ nullable: true })
  category?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'image_url', nullable: true })
  imageUrl?: string;

  @Column({ name: 'is_featured', default: false })
  isFeatured!: boolean;

  @Column({ name: 'manage_stock', default: false })
  manageStock!: boolean;

  @Column({ name: 'stock_quantity', type: 'int', default: 0 })
  stockQuantity!: number;

  @Column({ name: 'low_stock_alert', type: 'int', default: 3 })
  lowStockAlert!: number;

  @Column({ name: 'weight_g', type: 'int', nullable: true })
  weightG?: number | null;

  @Column({ name: 'length_cm', type: 'int', nullable: true })
  lengthCm?: number | null;

  @Column({ name: 'width_cm', type: 'int', nullable: true })
  widthCm?: number | null;

  @Column({ name: 'height_cm', type: 'int', nullable: true })
  heightCm?: number | null;

  @Column({ default: true })
  active!: boolean;

  @Column({ name: 'availability_days', type: 'jsonb', nullable: true })
  availabilityDays?: Record<string, boolean> | null;

  @Column({ type: 'jsonb', nullable: true })
  modifiers?: Array<{ id: string; name: string; price: number; active?: boolean }> | null;

  @ManyToOne(() => Store, (store) => store.products, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store!: Store;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.product)
  orderItems!: OrderItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
