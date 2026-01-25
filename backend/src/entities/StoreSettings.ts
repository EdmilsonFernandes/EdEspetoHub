/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: StoreSettings.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Store } from './Store';
import { sanitizeSocialLinks, SocialLink } from '../utils/socialLinks';

@Entity({ name: 'store_settings' })
/**
 * Provides StoreSettings functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2025-12-17
 */
export class StoreSettings
{
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl?: string | null;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'address', type: 'text', nullable: true })
  address?: string | null;

  @Column({ name: 'primary_color', default: '#b91c1c' })
  primaryColor!: string;

  @Column({ name: 'secondary_color', type: 'varchar', nullable: true })
  secondaryColor?: string | null;

  @Column({ name: 'pix_key', type: 'varchar', nullable: true })
  pixKey?: string | null;

  @Column({ name: 'contact_email', type: 'varchar', nullable: true })
  contactEmail?: string | null;

  @Column({ name: 'promo_message', type: 'text', nullable: true })
  promoMessage?: string | null;

  @Column('decimal', { name: 'delivery_radius_km', precision: 10, scale: 2, nullable: true })
  deliveryRadiusKm?: number | null;

  @Column('decimal', { name: 'delivery_fee', precision: 10, scale: 2, nullable: true })
  deliveryFee?: number | null;

  @Column({
    name: 'social_links',
    type: 'jsonb',
    nullable: true,
    default: () => "'[]'::jsonb",
    transformer: {
      to: (value?: SocialLink[] | null) => sanitizeSocialLinks(value ?? []),
      from: (value: SocialLink[] | null) => (Array.isArray(value) ? value : []),
    },
  })
  socialLinks?: SocialLink[];

  @Column({
    name: 'opening_hours',
    type: 'jsonb',
    nullable: true,
    default: () => "'[]'::jsonb",
    transformer: {
      to: (value?: unknown[] | null) => (Array.isArray(value) ? value : []),
      from: (value: unknown[] | null) => (Array.isArray(value) ? value : []),
    },
  })
  openingHours?: any[];

  @Column({
    name: 'order_types',
    type: 'jsonb',
    nullable: true,
    default: () => "'[\"delivery\",\"pickup\",\"table\"]'::jsonb",
    transformer: {
      to: (value?: string[] | null) => (Array.isArray(value) ? value : [ 'delivery', 'pickup', 'table' ]),
      from: (value: string[] | null) => (Array.isArray(value) ? value : [ 'delivery', 'pickup', 'table' ]),
    },
  })
  orderTypes?: string[];

  @OneToOne(() => Store, (store) => store.settings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store!: Store;
}
