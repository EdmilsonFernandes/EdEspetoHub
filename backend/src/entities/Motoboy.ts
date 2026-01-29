/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: Motoboy.ts
 * @Date: 2026-01-29
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
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
} from 'typeorm';
import { User } from './User';
import { MotoboyDocument } from './MotoboyDocument';

@Entity({ name: 'motoboys' })
/**
 * Provides Motoboy functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-29
 */
export class Motoboy {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', unique: true })
  userId!: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ default: 'PENDING_VERIFICATION' })
  status!: string;

  @Column({ name: 'created_by_user_id', nullable: true })
  createdByUserId?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser?: User | null;

  @Column({ name: 'approved_by_user_id', nullable: true })
  approvedByUserId?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by_user_id' })
  approvedByUser?: User | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt?: Date | null;

  @Column({ name: 'vehicle_type', nullable: true })
  vehicleType?: string | null;

  @Column({ name: 'vehicle_plate', nullable: true })
  vehiclePlate?: string | null;

  @Column({ name: 'vehicle_model', nullable: true })
  vehicleModel?: string | null;

  @Column({ name: 'vehicle_color', nullable: true })
  vehicleColor?: string | null;

  @Column({ name: 'city', nullable: true })
  city?: string | null;

  @Column({ name: 'state', nullable: true })
  state?: string | null;

  @Column({ name: 'address', nullable: true })
  address?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => MotoboyDocument, (doc) => doc.motoboy)
  documents?: MotoboyDocument[];
}
