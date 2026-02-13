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
    ADD COLUMN IF NOT EXISTS plan_exempt BOOLEAN DEFAULT FALSE;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS store_settings
    ADD COLUMN IF NOT EXISTS plan_exempt_label TEXT;
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
    ALTER TABLE IF EXISTS store_settings
    ADD COLUMN IF NOT EXISTS prep_base_minutes INT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS store_settings
    ADD COLUMN IF NOT EXISTS prep_per_item_minutes INT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS store_settings
    ADD COLUMN IF NOT EXISTS queue_capacity_per_hour INT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS store_settings
    ADD COLUMN IF NOT EXISTS queue_buffer_minutes INT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS store_settings
    ADD COLUMN IF NOT EXISTS eta_buffer_minutes INT;
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
    ALTER TABLE IF EXISTS orders
    ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'PENDING';
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
    ALTER TABLE IF EXISTS order_items
    ADD COLUMN IF NOT EXISTS selected_modifiers JSONB;
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
    ALTER TABLE IF EXISTS products
    ADD COLUMN IF NOT EXISTS modifiers JSONB;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS plans
    ADD COLUMN IF NOT EXISTS display_name TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS plans
    ADD COLUMN IF NOT EXISTS promo_price NUMERIC(10,2);
  `);
  // Keep business plans consistent (Basic/Pro only) and avoid Premium showing up again.
  await AppDataSource.query(`
    UPDATE plans
    SET enabled = false
    WHERE name IN ('premium_monthly', 'premium_yearly');
  `);
  await AppDataSource.query(`
    INSERT INTO plans (name, display_name, price, promo_price, duration_days, enabled)
    VALUES
      ('basic_monthly', 'Basic Mensal', 49.90, NULL, 30, true),
      ('pro_monthly', 'Pro Mensal', 79.90, NULL, 30, true),
      ('basic_yearly', 'Basic Anual', 598.80, 509.98, 365, true),
      ('pro_yearly', 'Pro Anual', 958.80, 815.98, 365, true)
    ON CONFLICT (name) DO UPDATE
    SET display_name = EXCLUDED.display_name,
        price = EXCLUDED.price,
        promo_price = EXCLUDED.promo_price,
        duration_days = EXCLUDED.duration_days,
        enabled = EXCLUDED.enabled;
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
    ALTER TABLE IF EXISTS users
    ADD COLUMN IF NOT EXISTS user_role TEXT NOT NULL DEFAULT 'STORE_OWNER';
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS users
    ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
  `);
  await AppDataSource.query(`
    UPDATE users
    SET user_role = 'STORE_OWNER'
    WHERE user_role IS NULL
      AND id IN (SELECT owner_id FROM stores);
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
    INSERT INTO site_settings (key, value)
    VALUES
      ('legal.terms', '<h2>Termos de uso</h2><p>Atualize os termos no painel do super admin.</p>'),
      ('legal.lgpd', '<h2>LGPD</h2><p>Atualize a política LGPD no painel do super admin.</p>')
    ON CONFLICT (key) DO NOTHING;
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
    ALTER TABLE IF EXISTS email_verifications
    ADD COLUMN IF NOT EXISTS request_ip TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS email_verifications
    ADD COLUMN IF NOT EXISTS resend_count INT NOT NULL DEFAULT 1;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS email_verifications
    ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMPTZ;
  `);
  await AppDataSource.query(`
    UPDATE email_verifications
    SET last_sent_at = COALESCE(last_sent_at, created_at),
        resend_count = COALESCE(resend_count, 1)
    WHERE last_sent_at IS NULL OR resend_count IS NULL;
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_email_verifications_user_created
    ON email_verifications(user_id, created_at DESC);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_email_verifications_ip_created
    ON email_verifications(request_ip, created_at DESC)
    WHERE request_ip IS NOT NULL;
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
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS order_eta_estimates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      algo_version TEXT NOT NULL,
      prep_minutes INT NOT NULL,
      queue_minutes INT NOT NULL,
      travel_minutes INT,
      buffer_minutes INT NOT NULL,
      total_minutes INT NOT NULL,
      window_min INT NOT NULL,
      window_max INT NOT NULL,
      distance_km NUMERIC(10,2),
      confidence TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_order_eta_estimates_order_id ON order_eta_estimates(order_id);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_order_eta_estimates_store_id ON order_eta_estimates(store_id);
  `);
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS motoboys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
      created_by_user_id UUID REFERENCES users(id),
      approved_by_user_id UUID REFERENCES users(id),
      approved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS motoboys
    ADD COLUMN IF NOT EXISTS vehicle_type TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS motoboys
    ADD COLUMN IF NOT EXISTS vehicle_plate TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS motoboys
    ADD COLUMN IF NOT EXISTS vehicle_model TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS motoboys
    ADD COLUMN IF NOT EXISTS vehicle_color TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS motoboys
    ADD COLUMN IF NOT EXISTS cnh_number TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS motoboys
    ADD COLUMN IF NOT EXISTS cnh_category TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS motoboys
    ADD COLUMN IF NOT EXISTS cnh_expires_at DATE;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS motoboys
    ADD COLUMN IF NOT EXISTS city TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS motoboys
    ADD COLUMN IF NOT EXISTS state TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS motoboys
    ADD COLUMN IF NOT EXISTS address TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS motoboys
    ADD COLUMN IF NOT EXISTS pix_key TEXT;
  `);
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS order_reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
      store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      motoboy_id UUID REFERENCES motoboys(id) ON DELETE SET NULL,
      customer_name TEXT,
      customer_phone TEXT,
      store_rating INT NOT NULL CHECK (store_rating BETWEEN 1 AND 5),
      delivery_rating INT CHECK (delivery_rating BETWEEN 1 AND 5),
      comment TEXT,
      store_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
      delivery_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
      tip_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_order_reviews_store_id ON order_reviews(store_id);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_order_reviews_motoboy_id ON order_reviews(motoboy_id);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_order_reviews_created_at ON order_reviews(created_at DESC);
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS order_reviews
    ADD COLUMN IF NOT EXISTS tip_status TEXT NOT NULL DEFAULT 'NONE';
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS order_reviews
    ADD COLUMN IF NOT EXISTS tip_provider TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS order_reviews
    ADD COLUMN IF NOT EXISTS tip_provider_id TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS order_reviews
    ADD COLUMN IF NOT EXISTS tip_payment_link TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS order_reviews
    ADD COLUMN IF NOT EXISTS tip_qr_code_base64 TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS order_reviews
    ADD COLUMN IF NOT EXISTS tip_qr_code_text TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS order_reviews
    ADD COLUMN IF NOT EXISTS tip_expires_at TIMESTAMPTZ;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS order_reviews
    ADD COLUMN IF NOT EXISTS tip_paid_at TIMESTAMPTZ;
  `);
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS motoboy_stores (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      motoboy_id UUID NOT NULL REFERENCES motoboys(id) ON DELETE CASCADE,
      store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(motoboy_id, store_id)
    );
  `);
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS order_deliveries (
      order_id UUID PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
      motoboy_id UUID REFERENCES motoboys(id) ON DELETE RESTRICT,
      assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      delivered_at TIMESTAMPTZ,
      payment_confirmed_at TIMESTAMPTZ,
      payment_confirmed_by_motoboy_id UUID REFERENCES motoboys(id) ON DELETE RESTRICT
    );
  `);
  // Evolve order_deliveries into a full "delivery" record (queue + workflow).
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS order_deliveries
    ALTER COLUMN motoboy_id DROP NOT NULL;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS order_deliveries
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'AVAILABLE';
  `);
  // Backfill legacy rows safely (avoid violating uq_active_delivery_per_motoboy).
  // Old versions inserted into order_deliveries without a workflow status; use orders.status and assigned_at to infer.
  // Guarantee: at most one active row per motoboy after backfill.
  await AppDataSource.query(`
    WITH ranked AS (
      SELECT
        od.order_id,
        od.motoboy_id,
        od.assigned_at,
        o.status AS order_status,
        ROW_NUMBER() OVER (PARTITION BY od.motoboy_id ORDER BY od.assigned_at DESC, od.order_id DESC) AS rn
      FROM order_deliveries od
      JOIN orders o ON o.id = od.order_id
      WHERE od.motoboy_id IS NOT NULL
        AND (od.status IS NULL OR od.status = 'AVAILABLE')
    )
    UPDATE order_deliveries od
    SET status = CASE
      WHEN ranked.order_status IN ('delivered','finished') OR od.delivered_at IS NOT NULL THEN 'DELIVERED'
      WHEN ranked.order_status = 'in_delivery' AND ranked.rn = 1 THEN 'IN_TRANSIT'
      WHEN ranked.rn = 1 THEN 'ACCEPTED'
      ELSE 'DELIVERED'
    END
    FROM ranked
    WHERE od.order_id = ranked.order_id;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS order_deliveries
    ADD COLUMN IF NOT EXISTS freight_value NUMERIC(10,2);
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS order_deliveries
    ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS order_deliveries
    ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS order_deliveries
    ADD COLUMN IF NOT EXISTS in_transit_at TIMESTAMPTZ;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS order_deliveries
    ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS order_deliveries
    ADD COLUMN IF NOT EXISTS canceled_reason TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS order_deliveries
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
  `);
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS delivery_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      delivery_id UUID NOT NULL REFERENCES order_deliveries(order_id) ON DELETE CASCADE,
      actor_type TEXT NOT NULL,
      actor_id UUID,
      from_status TEXT,
      to_status TEXT NOT NULL,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_delivery_events_delivery_id ON delivery_events(delivery_id);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_delivery_events_created_at ON delivery_events(created_at DESC);
  `);
  await AppDataSource.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_active_delivery_per_motoboy
    ON order_deliveries(motoboy_id)
    WHERE motoboy_id IS NOT NULL AND status IN ('ACCEPTED','PICKED_UP','IN_TRANSIT');
  `);
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS motoboy_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      motoboy_id UUID NOT NULL REFERENCES motoboys(id) ON DELETE CASCADE,
      doc_type TEXT NOT NULL,
      file_key TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at TIMESTAMPTZ
    );
  `);
  // Store assisted verification results (face match, counts, flags).
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS motoboy_documents
    ADD COLUMN IF NOT EXISTS metadata JSONB;
  `);
  await AppDataSource.query(`
    UPDATE motoboy_documents
    SET metadata = '{}'::jsonb
    WHERE metadata IS NULL;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS motoboy_documents
    ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS motoboy_documents
    ALTER COLUMN metadata SET NOT NULL;
  `);
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS motoboy_store_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      motoboy_id UUID NOT NULL REFERENCES motoboys(id) ON DELETE CASCADE,
      store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'PENDING',
      decided_by_user_id UUID REFERENCES users(id),
      reason TEXT,
      decided_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(motoboy_id, store_id)
    );
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS motoboy_store_requests
    ADD COLUMN IF NOT EXISTS reason TEXT;
  `);
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS motoboy_audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
      motoboy_id UUID REFERENCES motoboys(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      performed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_motoboy_audit_logs_store_id ON motoboy_audit_logs(store_id);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_motoboy_audit_logs_motoboy_id ON motoboy_audit_logs(motoboy_id);
  `);
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS delivery_billing_cycles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'OPEN',
      start_date TIMESTAMPTZ NOT NULL,
      end_date TIMESTAMPTZ NOT NULL,
      delivery_count INT NOT NULL DEFAULT 0,
      subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
      penalty_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
      total_due NUMERIC(10,2) NOT NULL DEFAULT 0,
      fee_rate NUMERIC(6,4) NOT NULL DEFAULT 0.03,
      min_fee NUMERIC(10,2) NOT NULL DEFAULT 0.50,
      cycle_days INT NOT NULL DEFAULT 30,
      penalty_daily_rate NUMERIC(6,4) NOT NULL DEFAULT 0.04,
      penalty_cap_rate NUMERIC(6,4) NOT NULL DEFAULT 1.0,
      payment_method TEXT NOT NULL DEFAULT 'PIX',
      payment_status TEXT NOT NULL DEFAULT 'PENDING',
      provider TEXT,
      provider_id TEXT,
      payment_link TEXT,
      qr_code_base64 TEXT,
      qr_code_text TEXT,
      expires_at TIMESTAMPTZ,
      closed_at TIMESTAMPTZ,
      paid_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_delivery_billing_cycles_store ON delivery_billing_cycles(store_id);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_delivery_billing_cycles_status ON delivery_billing_cycles(status);
  `);
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS delivery_billing_charges (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      cycle_id UUID NOT NULL REFERENCES delivery_billing_cycles(id) ON DELETE CASCADE,
      order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
      charge_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(order_id)
    );
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_delivery_billing_charges_cycle ON delivery_billing_charges(cycle_id);
  `);
}
