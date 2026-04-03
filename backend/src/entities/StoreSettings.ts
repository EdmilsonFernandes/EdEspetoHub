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

  @Column({ name: 'banner_url', type: 'text', nullable: true })
  bannerUrl?: string | null;

  @Column({ name: 'banner_position', type: 'varchar', nullable: true, default: 'center' })
  bannerPosition?: string | null;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'address', type: 'text', nullable: true })
  address?: string | null;

  @Column({ name: 'city', type: 'text', nullable: true })
  city?: string | null;

  @Column({ name: 'state', type: 'text', nullable: true })
  state?: string | null;

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

  @Column({ name: 'is_ordering_enabled', type: 'boolean', default: true })
  isOrderingEnabled!: boolean;

  @Column({ name: 'segment', type: 'varchar', nullable: true, default: 'outros' })
  segment?: string | null;

  @Column({
    name: 'category_priorities',
    type: 'jsonb',
    nullable: true,
    default: () => "'{}'::jsonb",
    transformer: {
      to: (value?: Record<string, number> | null) => (value && typeof value === 'object' ? value : {}),
      from: (value: Record<string, number> | null) => (value && typeof value === 'object' ? value : {}),
    },
  })
  categoryPriorities?: Record<string, number> | null;

  @Column({ name: 'prep_base_minutes', type: 'int', nullable: true })
  prepBaseMinutes?: number | null;

  @Column({ name: 'prep_per_item_minutes', type: 'int', nullable: true })
  prepPerItemMinutes?: number | null;

  @Column({ name: 'prep_attention_minutes', type: 'int', nullable: true })
  prepAttentionMinutes?: number | null;

  @Column({ name: 'queue_capacity_per_hour', type: 'int', nullable: true })
  queueCapacityPerHour?: number | null;

  @Column({ name: 'queue_buffer_minutes', type: 'int', nullable: true })
  queueBufferMinutes?: number | null;

  @Column({ name: 'eta_buffer_minutes', type: 'int', nullable: true })
  etaBufferMinutes?: number | null;

  @Column({ name: 'plan_exempt', type: 'boolean', default: false })
  planExempt!: boolean;

  @Column({ name: 'plan_exempt_label', type: 'text', nullable: true })
  planExemptLabel?: string | null;

  @Column('decimal', { name: 'delivery_radius_km', precision: 10, scale: 2, nullable: true })
  deliveryRadiusKm?: number | null;

  @Column('decimal', { name: 'delivery_fee', precision: 10, scale: 2, nullable: true })
  deliveryFee?: number | null;

  @Column({ name: 'postal_enabled', type: 'boolean', default: false })
  postalEnabled!: boolean;

  @Column({ name: 'postal_origin_zip', type: 'varchar', nullable: true })
  postalOriginZip?: string | null;

  @Column({ name: 'order_notification_sound', type: 'text', nullable: true })
  orderNotificationSound?: string | null;

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
