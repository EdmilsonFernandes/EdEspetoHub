/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: OrderReview.ts
 * @Date: 2026-02-13
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
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

  // Resposta pública do lojista à avaliação (audit 16/08: "avaliações sem resposta do lojista")
  @Column({ name: 'store_reply', type: 'text', nullable: true })
  storeReply?: string | null;

  @Column({ name: 'store_replied_at', type: 'timestamptz', nullable: true })
  storeRepliedAt?: Date | null;

  @Column({ name: 'store_tags', type: 'jsonb', default: () => "'[]'" })
  storeTags!: string[];

  @Column({ name: 'delivery_tags', type: 'jsonb', default: () => "'[]'" })
  deliveryTags!: string[];

  @Column('decimal', { name: 'tip_amount', precision: 10, scale: 2, default: 0 })
  tipAmount!: number;

  @Column({ name: 'tip_status', type: 'varchar', default: 'NONE' })
  tipStatus!: 'NONE' | 'PENDING' | 'PAID' | 'FAILED';

  @Column({ name: 'tip_provider', type: 'varchar', nullable: true })
  tipProvider?: string | null;

  @Column({ name: 'tip_provider_id', type: 'varchar', nullable: true })
  tipProviderId?: string | null;

  @Column({ name: 'tip_payment_link', type: 'text', nullable: true })
  tipPaymentLink?: string | null;

  @Column({ name: 'tip_qr_code_base64', type: 'text', nullable: true })
  tipQrCodeBase64?: string | null;

  @Column({ name: 'tip_qr_code_text', type: 'text', nullable: true })
  tipQrCodeText?: string | null;

  @Column({ name: 'tip_expires_at', type: 'timestamptz', nullable: true })
  tipExpiresAt?: Date | null;

  @Column({ name: 'tip_paid_at', type: 'timestamptz', nullable: true })
  tipPaidAt?: Date | null;

  @Column({ name: 'tip_settlement_mode', type: 'varchar', default: 'STORE_PAYOUT' })
  tipSettlementMode!: 'STORE_PAYOUT' | 'DIRECT_MOTOBOY';

  @Column({ name: 'tip_payout_status', type: 'varchar', default: 'PENDING' })
  tipPayoutStatus!: 'PENDING' | 'PAID';

  @Column({ name: 'tip_payout_at', type: 'timestamptz', nullable: true })
  tipPayoutAt?: Date | null;

  @Column({ name: 'tip_payout_proof_url', type: 'text', nullable: true })
  tipPayoutProofUrl?: string | null;

  @Column({ name: 'tip_payout_notes', type: 'text', nullable: true })
  tipPayoutNotes?: string | null;

  @Column({ name: 'tip_payout_by_user_id', type: 'uuid', nullable: true })
  tipPayoutByUserId?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
