/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: PasswordReset.ts
 * @Date: 2026-01-06
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './User';

@Entity({ name: 'password_resets' })
/**
 * Provides PasswordReset functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2026-01-06
 */
export class PasswordReset {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'token_hash', type: 'varchar' })
  tokenHash!: string;

  @Column({ name: 'resend_count', type: 'int', default: 0 })
  resendCount!: number;

  @Column({ name: 'attempts_count', type: 'int', default: 0 })
  attemptsCount!: number;

  @Column({ name: 'request_ip', type: 'text', nullable: true })
  requestIp?: string | null;

  @Column({ name: 'last_sent_at', type: 'timestamptz', nullable: true })
  lastSentAt?: Date | null;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt?: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;
}
