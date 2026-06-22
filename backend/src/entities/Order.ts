/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: Order.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Store } from './Store';
import { OrderItem } from './OrderItem';
import { OrderShipment } from './OrderShipment';
import { User } from './User';
import { OrderPayment } from './OrderPayment';

@Entity({ name: 'orders' })
/**
 * Provides Order functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2025-12-17
 */
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'customer_name' })
  customerName!: string;

  @Column({ name: 'customer_note', type: 'text', nullable: true })
  customerNote?: string | null;

  @Column({ nullable: true })
  phone?: string;

  @Column({ name: 'customer_user_id', type: 'uuid', nullable: true })
  customerUserId?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customer_user_id' })
  customerUser?: User | null;

  @Column({ name: 'guest_push_id', type: 'text', nullable: true })
  guestPushId?: string | null;

  @Column({ nullable: true })
  address?: string;

  @Column({ name: 'table_number', nullable: true })
  table?: string;

  @Column({ default: 'delivery' })
  type!: string;

  @Column({ name: 'scheduled_for', type: 'timestamptz', nullable: true })
  scheduledFor?: Date | null;

  @Column({ name: 'party_size', type: 'int', nullable: true })
  partySize?: number | null;

  @Column({ name: 'fulfillment_mode', default: 'distance' })
  fulfillmentMode!: string;

  @Column({ name: 'condominium_id', type: 'uuid', nullable: true })
  condominiumId?: string | null;

  @Column({ name: 'condominium_event_id', type: 'uuid', nullable: true })
  condominiumEventId?: string | null;

  @Column({ name: 'condominium_name', type: 'text', nullable: true })
  condominiumName?: string | null;

  @Column({ name: 'condominium_event_title', type: 'text', nullable: true })
  condominiumEventTitle?: string | null;

  @Column({ name: 'condominium_fulfillment_mode', type: 'text', nullable: true })
  condominiumFulfillmentMode?: string | null;

  @Column({ name: 'condominium_unit', type: 'jsonb', nullable: true })
  condominiumUnit?: Record<string, any> | null;

  @Column({ default: 'pending' })
  status!: string;

  @Column({ name: 'canceled_at', type: 'timestamptz', nullable: true })
  canceledAt?: Date | null;
  @Column({ name: "status_timeline", type: "jsonb", nullable: true, default: "[]" })
  statusTimeline?: Array<{ status: string; at: string }> | null;

  @Column({ name: 'canceled_reason', type: 'text', nullable: true })
  canceledReason?: string | null;

  @Column({ name: 'customer_received_at', type: 'timestamptz', nullable: true })
  customerReceivedAt?: Date | null;

  @Column({ name: 'customer_received_confirmed_by_user_id', type: 'uuid', nullable: true })
  customerReceivedConfirmedByUserId?: string | null;

  @Column({ name: 'payment_method', nullable: true })
  paymentMethod?: string;

  @Column({ name: 'payment_status', default: 'PENDING' })
  paymentStatus!: string;

  @Column('decimal', { name: 'cash_tendered', precision: 10, scale: 2, nullable: true })
  cashTendered?: number | null;

  @Column('decimal', { name: 'delivery_fee', precision: 10, scale: 2, nullable: true })
  deliveryFee?: number | null;

  @Column('decimal', { precision: 10, scale: 2 })
  total!: number;

  @ManyToOne(() => Store, (store) => store.orders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store!: Store;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true, eager: true })
  items!: OrderItem[];

  @OneToOne(() => OrderShipment, (shipment) => shipment.order, { nullable: true })
  shipment?: OrderShipment | null;

  @OneToOne(() => OrderPayment, (op) => op.order, { nullable: true })
  orderPayment?: OrderPayment | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
