/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: MotoboyDocument.ts
 * @Date: 2026-01-29
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Motoboy } from './Motoboy';
import { User } from './User';
/**
 * Represents motoboy document entity.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2026-01-29
 */
@Entity('motoboy_documents')
export class MotoboyDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'motoboy_id' })
  motoboyId!: string;

  @Column({ name: 'doc_type' })
  docType!: string;

  @Column({ name: 'file_key' })
  fileKey!: string;

  @Column({ default: 'PENDING' })
  status!: string;

  @Column({ name: 'uploaded_at', type: 'timestamptz', default: () => 'NOW()' })
  uploadedAt!: Date;

  @Column({ name: 'reviewed_by_user_id', nullable: true })
  reviewedByUserId?: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt?: Date | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata!: any;

  @ManyToOne(() => Motoboy, (motoboy) => motoboy.documents)
  @JoinColumn({ name: 'motoboy_id' })
  motoboy!: Motoboy;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reviewed_by_user_id' })
  reviewedBy?: User;
}
