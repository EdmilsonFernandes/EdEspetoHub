/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: CondominiumEvent.ts
 * @Date: 2026-04-13
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Condominium } from './Condominium';
import { CondominiumEventStore } from './CondominiumEventStore';

@Entity({ name: 'condominium_events' })
export class CondominiumEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Condominium, (condominium) => condominium.events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'condominium_id' })
  condominium!: Condominium;

  @Column({ name: 'condominium_id' })
  condominiumId!: string;

  @Column()
  title!: string;

  @Column({ type: 'text', default: 'scheduled' })
  status!: string;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt!: Date;

  @Column({ name: 'ends_at', type: 'timestamptz' })
  endsAt!: Date;

  @Column({ name: 'pickup_location', type: 'text', nullable: true })
  pickupLocation?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ default: true })
  active!: boolean;

  @OneToMany(() => CondominiumEventStore, (link) => link.event)
  storeLinks!: CondominiumEventStore[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
