/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: MotoboyStore.ts
 * @Date: 2026-01-29
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Motoboy } from './Motoboy';
import { Store } from './Store';

@Entity({ name: 'motoboy_stores' })
/**
 * Provides MotoboyStore functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2026-01-29
 */
export class MotoboyStore {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'motoboy_id' })
  motoboyId!: string;

  @ManyToOne(() => Motoboy, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'motoboy_id' })
  motoboy?: Motoboy;

  @Column({ name: 'store_id' })
  storeId!: string;

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store?: Store;

  @Column({ default: true })
  active!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
