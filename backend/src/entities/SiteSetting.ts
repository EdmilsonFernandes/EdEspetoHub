/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: SiteSetting.ts
 * @Date: 2026-01-08
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'site_settings' })
/**
 * Provides SiteSetting functionality.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2026-01-08
 */
export class SiteSetting {
  @PrimaryColumn({ name: 'key', type: 'text' })
  key!: string;

  @Column({ name: 'value', type: 'text' })
  value!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}