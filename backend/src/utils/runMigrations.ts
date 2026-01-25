/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: runMigrations.ts
 * @Date: 2026-01-05
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import { AppDataSource } from '../config/database';
/**
 * Handles run migrations.
 *
 * @author Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 * @date 2026-01-05
 */
export async function runMigrations() {
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS store_settings
    ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '[]';
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS store_settings
    ADD COLUMN IF NOT EXISTS opening_hours JSONB DEFAULT '[]';
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS store_settings
    ADD COLUMN IF NOT EXISTS order_types JSONB DEFAULT '["delivery","pickup","table"]';
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS store_settings
    ADD COLUMN IF NOT EXISTS description TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS store_settings
    ADD COLUMN IF NOT EXISTS address TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS store_settings
    ADD COLUMN IF NOT EXISTS pix_key TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS store_settings
    ADD COLUMN IF NOT EXISTS contact_email TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS store_settings
    ADD COLUMN IF NOT EXISTS promo_message TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS store_settings
    ADD COLUMN IF NOT EXISTS delivery_radius_km NUMERIC(10,2);
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS store_settings
    ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2);
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS orders
    ADD COLUMN IF NOT EXISTS table_number TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS orders
    ADD COLUMN IF NOT EXISTS cash_tendered NUMERIC(10,2);
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS orders
    ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2);
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS products
    ADD COLUMN IF NOT EXISTS description TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS products
    ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS order_items
    ADD COLUMN IF NOT EXISTS cooking_point TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS order_items
    ADD COLUMN IF NOT EXISTS pass_skewer BOOLEAN DEFAULT FALSE;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS products
    ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS products
    ADD COLUMN IF NOT EXISTS promo_price NUMERIC(10,2);
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS products
    ADD COLUMN IF NOT EXISTS promo_active BOOLEAN NOT NULL DEFAULT FALSE;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS products
    ADD COLUMN IF NOT EXISTS availability_days JSONB;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS plans
    ADD COLUMN IF NOT EXISTS display_name TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS plans
    ADD COLUMN IF NOT EXISTS promo_price NUMERIC(10,2);
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS payments
    ADD COLUMN IF NOT EXISTS qr_code_text TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS users
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS users
    ADD COLUMN IF NOT EXISTS document TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS users
    ADD COLUMN IF NOT EXISTS document_type TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS users
    ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS users
    ADD COLUMN IF NOT EXISTS lgpd_accepted_at TIMESTAMPTZ;
  `);
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS email_verifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications(user_id);
  `);
  await AppDataSource.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_document_unique ON users (document) WHERE document IS NOT NULL;
  `);
  await AppDataSource.query(`
    DROP INDEX IF EXISTS idx_stores_name_unique;
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token_hash);
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS subscriptions
    ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'PIX';
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS subscriptions
    ADD COLUMN IF NOT EXISTS reminder_stage INT DEFAULT 0;
  `);
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS platform_admins (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await AppDataSource.query(`
    INSERT INTO platform_admins (username, password_hash)
    SELECT 'chamanoespetoadmin', crypt('chamanoespeto2026#!', gen_salt('bf'))
    WHERE NOT EXISTS (
      SELECT 1 FROM platform_admins WHERE username = 'chamanoespetoadmin'
    );
  `);
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS access_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      store_id UUID,
      role TEXT NOT NULL,
      method TEXT NOT NULL,
      path TEXT NOT NULL,
      status INT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON access_logs(created_at DESC);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_access_logs_role ON access_logs(role);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_access_logs_store_id ON access_logs(store_id);
  `);
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS store_link_hits (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      referrer TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_store_link_hits_store_id ON store_link_hits(store_id);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_store_link_hits_created_at ON store_link_hits(created_at DESC);
  `);
}
