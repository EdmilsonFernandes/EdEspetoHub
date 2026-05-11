/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: OrderDelivery.ts
 * @Date: 2026-01-29
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { Order } from './Order';
import { Motoboy } from './Motoboy';

@Entity({ name: 'order_deliveries' })
/**
 * Provides OrderDelivery functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2026-01-29
 */
export class OrderDelivery {
  @PrimaryColumn('uuid', { name: 'order_id' })
  orderId!: string;

  @OneToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order?: Order;

  @Column({ name: 'motoboy_id', nullable: true })
  motoboyId?: string | null;

  @Column({ default: 'AVAILABLE' })
  status!: string;

  @Column('decimal', { name: 'freight_value', precision: 10, scale: 2, nullable: true })
  freightValue?: number | null;

  @ManyToOne(() => Motoboy, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'motoboy_id' })
  motoboy?: Motoboy;

  @CreateDateColumn({ name: 'assigned_at' })
  assignedAt!: Date;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt?: Date | null;

  @Column({ name: 'picked_up_at', type: 'timestamptz', nullable: true })
  pickedUpAt?: Date | null;

  @Column({ name: 'in_transit_at', type: 'timestamptz', nullable: true })
  inTransitAt?: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt?: Date | null;
  @Column({ name: "confirmation_code", type: "varchar", length: 4, nullable: true })
  confirmationCode?: string | null;

  @Column({ name: 'confirmation_code_attempts', type: 'int', default: 0 })
  confirmationCodeAttempts!: number;

  @Column({ name: 'confirmation_code_blocked_at', type: 'timestamptz', nullable: true })
  confirmationCodeBlockedAt?: Date | null;

  @Column({ name: 'canceled_at', type: 'timestamptz', nullable: true })
  canceledAt?: Date | null;

  @Column({ name: 'canceled_reason', type: 'text', nullable: true })
  canceledReason?: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt?: Date | null;

  @Column({ name: 'payment_confirmed_at', type: 'timestamptz', nullable: true })
  paymentConfirmedAt?: Date | null;

  @Column({ name: 'payment_confirmed_by_motoboy_id', nullable: true })
  paymentConfirmedByMotoboyId?: string | null;

  @ManyToOne(() => Motoboy, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'payment_confirmed_by_motoboy_id' })
  paymentConfirmedByMotoboy?: Motoboy | null;
}
