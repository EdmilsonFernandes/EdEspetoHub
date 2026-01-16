/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: User.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Store } from './Store';

@Entity({ name: 'users' })
/**
 * Provides User functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2025-12-17
 */
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'full_name' })
  fullName!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ name: 'email_verified', default: false })
  emailVerified!: boolean;

  @Column()
  password!: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  document?: string;

  @Column({ name: 'document_type', nullable: true })
  documentType?: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ name: 'terms_accepted_at', type: 'timestamptz', nullable: true })
  termsAcceptedAt?: Date;

  @Column({ name: 'lgpd_accepted_at', type: 'timestamptz', nullable: true })
  lgpdAcceptedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => Store, (store) => store.owner)
  stores!: Store[];
}