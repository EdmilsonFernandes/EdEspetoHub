/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: runMigrations.ts
 * @Date: 2026-01-05
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import { AppDataSource } from '../config/database';
/**
 * Handles run migrations.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
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
    ADD COLUMN IF NOT EXISTS banner_url TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS store_settings
    ADD COLUMN IF NOT EXISTS banner_position VARCHAR DEFAULT 'center';
  `);
  await AppDataSource.query(`
    UPDATE store_settings
    SET banner_position = CASE
      WHEN LOWER(COALESCE(banner_position, '')) = 'top' THEN 'top'
      ELSE 'center'
    END
    WHERE banner_position IS NULL OR LOWER(COALESCE(banner_position, '')) NOT IN ('center','top');
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS store_settings
    ADD COLUMN IF NOT EXISTS address TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS store_settings
    ADD COLUMN IF NOT EXISTS city TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS store_settings
    ADD COLUMN IF NOT EXISTS state TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS store_settings
    ADD COLUMN IF NOT EXISTS lat NUMERIC(10,7);
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS store_settings
    ADD COLUMN IF NOT EXISTS lng NUMERIC(10,7);
  `);
  await AppDataSource.query(`
    UPDATE store_settings ss
    SET address = u.address
    FROM stores s
    JOIN users u ON u.id = s.owner_id
    WHERE ss.store_id = s.id
      AND (ss.address IS NULL OR TRIM(ss.address) = '')
      AND u.address IS NOT NULL
      AND TRIM(u.address) <> '';
  `);
  await AppDataSource.query(`
    UPDATE store_settings
    SET state = UPPER((regexp_match(address, '(?i)(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\\b'))[1])
    WHERE (state IS NULL OR TRIM(state) = '')
      AND address IS NOT NULL
      AND TRIM(address) <> '';
  `);
  await AppDataSource.query(`
    UPDATE store_settings
    SET city = TRIM((regexp_match(address, '(?i)(?:\\||,|\\s)([^|,\\-/]{2,})\\s*[-/]\\s*(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\\b'))[1])
    WHERE (city IS NULL OR TRIM(city) = '')
      AND address IS NOT NULL
      AND TRIM(address) <> '';
  `);
  await AppDataSource.query(`
    UPDATE store_settings
    SET state = UPPER(TRIM(split_part(split_part(address, '|', 3), '-', 2)))
    WHERE (state IS NULL OR TRIM(state) = '')
      AND address LIKE '%|%'
      AND split_part(address, '|', 3) LIKE '%-%';
  `);
  await AppDataSource.query(`
    UPDATE store_settings
    SET city = TRIM(split_part(split_part(address, '|', 3), '-', 1))
    WHERE (city IS NULL OR TRIM(city) = '')
      AND address LIKE '%|%'
      AND split_part(address, '|', 3) LIKE '%-%';
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
    ADD COLUMN IF NOT EXISTS is_ordering_enabled BOOLEAN DEFAULT TRUE;
  `);
  await AppDataSource.query(`
    UPDATE store_settings
    SET is_ordering_enabled = TRUE
    WHERE is_ordering_enabled IS NULL;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS store_settings
    ADD COLUMN IF NOT EXISTS segment VARCHAR DEFAULT 'outros';
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS store_settings
    ADD COLUMN IF NOT EXISTS category_priorities JSONB DEFAULT '{}'::jsonb;
  `);
  await AppDataSource.query(`
    UPDATE store_settings
    SET category_priorities = COALESCE(category_priorities, '{}'::jsonb)
    WHERE category_priorities IS NULL;
  `);
  await AppDataSource.query(`
    WITH category_seed AS (
      SELECT
        p.store_id,
        LOWER(
          REGEXP_REPLACE(
            TRANSLATE(COALESCE(p.category, ''), 'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇç', 'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc'),
            '[^a-zA-Z0-9]+',
            '-',
            'g'
          )
        ) AS category_key,
        CASE
          WHEN LOWER(
            REGEXP_REPLACE(
              TRANSLATE(COALESCE(p.category, ''), 'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇç', 'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc'),
              '[^a-zA-Z0-9]+',
              '-',
              'g'
            )
          ) IN ('refeicao', 'refeicoes') THEN 1
          WHEN LOWER(
            REGEXP_REPLACE(
              TRANSLATE(COALESCE(p.category, ''), 'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇç', 'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc'),
              '[^a-zA-Z0-9]+',
              '-',
              'g'
            )
          ) IN ('porcao', 'porcoes') THEN 2
          WHEN LOWER(
            REGEXP_REPLACE(
              TRANSLATE(COALESCE(p.category, ''), 'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇç', 'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc'),
              '[^a-zA-Z0-9]+',
              '-',
              'g'
            )
          ) IN ('bebida', 'bebidas') THEN 3
          WHEN LOWER(
            REGEXP_REPLACE(
              TRANSLATE(COALESCE(p.category, ''), 'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇç', 'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc'),
              '[^a-zA-Z0-9]+',
              '-',
              'g'
            )
          ) IN ('cerveja', 'cervejas') THEN 4
          WHEN LOWER(
            REGEXP_REPLACE(
              TRANSLATE(COALESCE(p.category, ''), 'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇç', 'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc'),
              '[^a-zA-Z0-9]+',
              '-',
              'g'
            )
          ) IN ('destilado', 'destilados') THEN 5
          ELSE 99
        END AS priority
      FROM products p
      WHERE COALESCE(TRIM(p.category), '') <> ''
    ),
    grouped AS (
      SELECT store_id, category_key, MIN(priority) AS priority
      FROM category_seed
      WHERE COALESCE(category_key, '') <> ''
      GROUP BY store_id, category_key
    ),
    payload AS (
      SELECT
        store_id,
        jsonb_object_agg(category_key, priority) AS priority_map
      FROM grouped
      GROUP BY store_id
    )
    UPDATE store_settings ss
    SET category_priorities = payload.priority_map || COALESCE(ss.category_priorities, '{}'::jsonb)
    FROM payload
    WHERE ss.store_id = payload.store_id;
  `);
  await AppDataSource.query(`
    UPDATE store_settings
    SET segment = COALESCE(NULLIF(TRIM(segment), ''), 'outros')
    WHERE segment IS NULL OR TRIM(segment) = '';
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
    ADD COLUMN IF NOT EXISTS postal_enabled BOOLEAN NOT NULL DEFAULT FALSE;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS store_settings
    ADD COLUMN IF NOT EXISTS postal_origin_zip VARCHAR(8);
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS store_settings
    ADD COLUMN IF NOT EXISTS order_notification_sound TEXT;
  `);

  await AppDataSource.query(`
    ALTER TABLE IF EXISTS store_settings
    ADD COLUMN IF NOT EXISTS acquisition_attribution JSONB;
  `);
  await AppDataSource.query(`
    UPDATE store_settings
    SET postal_origin_zip = LEFT(REGEXP_REPLACE(COALESCE(postal_origin_zip, ''), '\\D', '', 'g'), 8)
    WHERE postal_origin_zip IS NOT NULL;
  `);
  await AppDataSource.query(`
    UPDATE store_settings
    SET postal_enabled = FALSE
    WHERE postal_enabled = TRUE
      AND (postal_origin_zip IS NULL OR LENGTH(postal_origin_zip) <> 8);
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
    ADD COLUMN IF NOT EXISTS prep_attention_minutes INT;
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
    UPDATE store_settings
    SET prep_base_minutes = 20
    WHERE prep_base_minutes IS NULL OR prep_base_minutes < 5;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS store_settings
    ALTER COLUMN prep_base_minutes SET DEFAULT 20;
  `);
  await AppDataSource.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_store_settings_prep_base_minutes_min'
      ) THEN
        ALTER TABLE store_settings
        ADD CONSTRAINT chk_store_settings_prep_base_minutes_min
        CHECK (prep_base_minutes IS NULL OR prep_base_minutes >= 5);
      END IF;
    END $$;
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
    CREATE TABLE IF NOT EXISTS store_payment_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'CONNECTED',
      provider_user_id TEXT,
      access_token_encrypted TEXT NOT NULL,
      refresh_token_encrypted TEXT,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_store_payment_accounts_store_provider UNIQUE (store_id, provider)
    );
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_store_payment_accounts_store
    ON store_payment_accounts(store_id);
  `);
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS order_payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      payment_method TEXT NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'PENDING',
      amount NUMERIC(10,2) NOT NULL,
      provider TEXT NOT NULL DEFAULT 'MERCADO_PAGO',
      provider_id TEXT,
      payment_link TEXT,
      qr_code_base64 TEXT,
      qr_code_text TEXT,
      expires_at TIMESTAMPTZ,
      paid_at TIMESTAMPTZ,
      failed_at TIMESTAMPTZ,
      provider_payload JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_order_payments_order UNIQUE (order_id)
    );
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_order_payments_store_created
    ON order_payments(store_id, created_at DESC);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_order_payments_provider_id
    ON order_payments(provider_id);
  `);
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS payment_audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      provider TEXT NOT NULL,
      flow_type TEXT NOT NULL,
      event_stage TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
      external_reference TEXT,
      provider_payment_id TEXT,
      provider_status TEXT,
      provider_status_detail TEXT,
      request_payload JSONB,
      response_payload JSONB,
      error_payload JSONB,
      http_status INT,
      success BOOLEAN,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_entity_created
    ON payment_audit_logs(entity_type, entity_id, created_at DESC);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_store_created
    ON payment_audit_logs(store_id, created_at DESC);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_provider_payment_id
    ON payment_audit_logs(provider_payment_id);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_external_reference
    ON payment_audit_logs(external_reference);
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS orders
    ADD COLUMN IF NOT EXISTS fulfillment_mode TEXT NOT NULL DEFAULT 'distance';
  `);
  await AppDataSource.query(`
    UPDATE orders
    SET fulfillment_mode = 'distance'
    WHERE fulfillment_mode IS NULL OR TRIM(fulfillment_mode) = '';
  `);
  await AppDataSource.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_orders_fulfillment_mode'
      ) THEN
        ALTER TABLE orders
        ADD CONSTRAINT chk_orders_fulfillment_mode
        CHECK (fulfillment_mode IN ('distance', 'postal'));
      END IF;
    END $$;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS orders
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  `);
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS order_shipments (
      order_id UUID PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
      provider TEXT,
      service_code TEXT,
      service_name TEXT,
      tracking_code TEXT,
      tracking_url TEXT,
      shipment_status TEXT NOT NULL DEFAULT 'pending_posting',
      quote_payload JSONB,
      tracking_last_event JSONB,
      tracking_last_at TIMESTAMPTZ,
      posted_at TIMESTAMPTZ,
      delivered_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_order_shipments_tracking_code
    ON order_shipments(tracking_code);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_order_shipments_status
    ON order_shipments(shipment_status);
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
    ALTER TABLE IF EXISTS order_items
    ADD COLUMN IF NOT EXISTS is_printed BOOLEAN NOT NULL DEFAULT FALSE;
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
    ADD COLUMN IF NOT EXISTS bundle_promo_qty INT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS products
    ADD COLUMN IF NOT EXISTS bundle_promo_price NUMERIC(10,2);
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS products
    ADD COLUMN IF NOT EXISTS bundle_promo_active BOOLEAN NOT NULL DEFAULT FALSE;
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
    ALTER TABLE IF EXISTS products
    ADD COLUMN IF NOT EXISTS manage_stock BOOLEAN NOT NULL DEFAULT FALSE;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS products
    ADD COLUMN IF NOT EXISTS stock_quantity INT NOT NULL DEFAULT 0;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS products
    ADD COLUMN IF NOT EXISTS low_stock_alert INT NOT NULL DEFAULT 3;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS products
    ADD COLUMN IF NOT EXISTS weight_g INT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS products
    ADD COLUMN IF NOT EXISTS length_cm INT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS products
    ADD COLUMN IF NOT EXISTS width_cm INT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS products
    ADD COLUMN IF NOT EXISTS height_cm INT;
  `);
  await AppDataSource.query(`
    UPDATE products
    SET manage_stock = FALSE
    WHERE manage_stock IS NULL;
  `);
  await AppDataSource.query(`
    UPDATE products
    SET stock_quantity = 0
    WHERE stock_quantity IS NULL;
  `);
  await AppDataSource.query(`
    UPDATE products
    SET low_stock_alert = 3
    WHERE low_stock_alert IS NULL OR low_stock_alert < 1;
  `);
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS inventory_movements (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
      movement_type TEXT NOT NULL,
      quantity INT NOT NULL,
      before_quantity INT NOT NULL,
      after_quantity INT NOT NULL,
      reason TEXT,
      actor_user_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS inventory_movements
    ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL;
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_inventory_movements_store_created
    ON inventory_movements(store_id, created_at DESC);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_created
    ON inventory_movements(product_id, created_at DESC);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_inventory_movements_order
    ON inventory_movements(order_id);
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
        price = CASE
          WHEN EXCLUDED.name IN ('basic_monthly', 'pro_monthly') THEN EXCLUDED.price
          ELSE plans.price
        END,
        promo_price = CASE
          WHEN EXCLUDED.name IN ('basic_monthly', 'pro_monthly') THEN EXCLUDED.promo_price
          ELSE plans.promo_price
        END,
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
    ALTER TABLE IF EXISTS users
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
  `);
  await AppDataSource.query(`
    UPDATE users
    SET user_role = 'STORE_OWNER'
    WHERE user_role IS NULL
      AND id IN (SELECT owner_id FROM stores);
  `);
  await AppDataSource.query(`
    UPDATE users
    SET user_role = 'OPERATOR'
    WHERE UPPER(COALESCE(user_role, '')) = 'CHURRASQUEIRO';
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
      ('legal.lgpd', '<h2>LGPD</h2><p>Atualize a política LGPD no painel do super admin.</p>'),
      ('hub_sponsored_daily_price', '14.90'),
      ('hub_sponsored_weekly_price', '79.90'),
      ('hub_sponsored_monthly_price', '249.90'),
      ('hub_sponsored_max_active_slots', '50')
    ON CONFLICT (key) DO NOTHING;
  `);
  await AppDataSource.query(`
    UPDATE site_settings
    SET value = '50', updated_at = NOW()
    WHERE key = 'hub_sponsored_max_active_slots'
      AND TRIM(COALESCE(value, '')) IN ('', '3', '3.0', '03');
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
    CREATE TABLE IF NOT EXISTS store_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (store_id, user_id)
    );
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_store_users_store_id ON store_users(store_id);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_store_users_user_id ON store_users(user_id);
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
    ALTER TABLE IF EXISTS order_reviews
    ADD COLUMN IF NOT EXISTS tip_payout_status TEXT NOT NULL DEFAULT 'PENDING';
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS order_reviews
    ADD COLUMN IF NOT EXISTS tip_payout_at TIMESTAMPTZ;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS order_reviews
    ADD COLUMN IF NOT EXISTS tip_payout_proof_url TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS order_reviews
    ADD COLUMN IF NOT EXISTS tip_payout_notes TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS order_reviews
    ADD COLUMN IF NOT EXISTS tip_payout_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
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
    ALTER TABLE IF EXISTS orders
    ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS orders
    ADD COLUMN IF NOT EXISTS canceled_reason TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS orders
    ADD COLUMN IF NOT EXISTS customer_received_at TIMESTAMPTZ;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS orders
    ADD COLUMN IF NOT EXISTS customer_received_confirmed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
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
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS users
    ADD COLUMN IF NOT EXISTS user_role VARCHAR DEFAULT 'STORE_OWNER';
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS orders
    ADD COLUMN IF NOT EXISTS customer_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_orders_customer_user_id
    ON orders(customer_user_id);
  `);
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS customer_addresses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      label TEXT,
      recipient_name TEXT,
      phone TEXT,
      cep VARCHAR(8) NOT NULL,
      street TEXT NOT NULL,
      number TEXT,
      complement TEXT,
      neighborhood TEXT,
      city TEXT NOT NULL,
      state VARCHAR(2) NOT NULL,
      lat NUMERIC(10,7),
      lng NUMERIC(10,7),
      is_default BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_customer_addresses_user_id
    ON customer_addresses(user_id);
  `);
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS customer_email_otps (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      request_ip TEXT,
      resend_count INT NOT NULL DEFAULT 1,
      attempts_count INT NOT NULL DEFAULT 0,
      last_sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_customer_email_otps_user_created
    ON customer_email_otps(user_id, created_at DESC);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_customer_email_otps_ip_created
    ON customer_email_otps(request_ip, created_at DESC)
    WHERE request_ip IS NOT NULL;
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_customer_email_otps_code_hash
    ON customer_email_otps(code_hash);
  `);
  await AppDataSource.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_addresses_default_per_user
    ON customer_addresses(user_id)
    WHERE is_default = TRUE;
  `);
  await AppDataSource.query(`
    WITH ranked AS (
      SELECT id, user_id,
             ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC, id ASC) AS rn
      FROM customer_addresses
      WHERE is_default = TRUE
    )
    UPDATE customer_addresses ca
    SET is_default = FALSE
    FROM ranked
    WHERE ca.id = ranked.id
      AND ranked.rn > 1;
  `);
  await AppDataSource.query(`
    UPDATE customer_addresses
    SET cep = LEFT(REGEXP_REPLACE(COALESCE(cep, ''), '\\D', '', 'g'), 8)
    WHERE cep IS NOT NULL;
  `);
  await AppDataSource.query(`
    UPDATE customer_addresses
    SET state = UPPER(LEFT(COALESCE(state, ''), 2))
    WHERE state IS NOT NULL;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS customer_addresses
    ADD COLUMN IF NOT EXISTS lat NUMERIC(10,7);
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS customer_addresses
    ADD COLUMN IF NOT EXISTS lng NUMERIC(10,7);
  `);
  // Rebrand migration (idempotent): update legacy brand/domain mentions in persisted text settings.
  await AppDataSource.query(`
    UPDATE site_settings
    SET value = REPLACE(value, 'www.janocaminho.com.br', 'www.janocaminho.com.br')
    WHERE value ILIKE '%www.janocaminho.com.br%';
  `);
  await AppDataSource.query(`
    UPDATE site_settings
    SET value = REPLACE(value, 'janocaminho.com.br', 'janocaminho.com.br')
    WHERE value ILIKE '%janocaminho.com.br%';
  `);
  await AppDataSource.query(`
    UPDATE site_settings
    SET value = REPLACE(value, 'Chama no Espeto', 'Jano Caminho')
    WHERE value ILIKE '%Chama no Espeto%';
  `);
  await AppDataSource.query(`
    UPDATE site_settings
    SET value = REPLACE(value, 'chamanoespeto', 'janocaminho')
    WHERE value ILIKE '%chamanoespeto%';
  `);
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS featured_product_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      requested_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
      payment_status TEXT NOT NULL DEFAULT 'PENDING',
      duration_days INT NOT NULL DEFAULT 7,
      duration_unit TEXT NOT NULL DEFAULT 'DAY',
      requested_slots INT NOT NULL DEFAULT 1,
      price_amount NUMERIC(10,2),
      payment_method TEXT NOT NULL DEFAULT 'PIX',
      payment_provider TEXT,
      payment_provider_id TEXT,
      payment_link TEXT,
      payment_qr_code_base64 TEXT,
      payment_qr_code_text TEXT,
      payment_expires_at TIMESTAMPTZ,
      payment_paid_at TIMESTAMPTZ,
      starts_at TIMESTAMPTZ,
      ends_at TIMESTAMPTZ,
      approved_by_admin_id TEXT,
      admin_note TEXT,
      public_note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS featured_product_requests
    ADD COLUMN IF NOT EXISTS duration_unit TEXT NOT NULL DEFAULT 'DAY';
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS featured_product_requests
    ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'PIX';
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS featured_product_requests
    ADD COLUMN IF NOT EXISTS payment_provider TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS featured_product_requests
    ADD COLUMN IF NOT EXISTS payment_provider_id TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS featured_product_requests
    ADD COLUMN IF NOT EXISTS payment_link TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS featured_product_requests
    ADD COLUMN IF NOT EXISTS payment_qr_code_base64 TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS featured_product_requests
    ADD COLUMN IF NOT EXISTS payment_qr_code_text TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS featured_product_requests
    ADD COLUMN IF NOT EXISTS payment_expires_at TIMESTAMPTZ;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS featured_product_requests
    ADD COLUMN IF NOT EXISTS payment_paid_at TIMESTAMPTZ;
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_featured_product_requests_store_id
    ON featured_product_requests(store_id);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_featured_product_requests_status
    ON featured_product_requests(status);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_featured_product_requests_ends_at
    ON featured_product_requests(ends_at);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_featured_product_requests_payment_provider_id
    ON featured_product_requests(payment_provider_id);
  `);
  await AppDataSource.query(`
    UPDATE featured_product_requests
    SET status = 'EXPIRED'
    WHERE status = 'APPROVED'
      AND ends_at IS NOT NULL
      AND ends_at < NOW();
  `);
  await AppDataSource.query(`
    UPDATE featured_product_requests
    SET status = 'PAID_WAITING_SLOT'
    WHERE payment_status = 'PAID'
      AND (status = 'PENDING' OR status = 'PENDING_PAYMENT');
  `);
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS customer_push_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL,
      platform TEXT NOT NULL DEFAULT 'android',
      app_version TEXT,
      device_model TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(token)
    );
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_customer_push_tokens_user_id
    ON customer_push_tokens(user_id);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_customer_push_tokens_is_active
    ON customer_push_tokens(is_active);
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS customer_push_tokens
    ADD COLUMN IF NOT EXISTS guest_id TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS customer_push_tokens
    ALTER COLUMN user_id DROP NOT NULL;
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_customer_push_tokens_guest_id
    ON customer_push_tokens(guest_id);
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS orders
    ADD COLUMN IF NOT EXISTS guest_push_id TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS orders
    ADD COLUMN IF NOT EXISTS condominium_id UUID;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS orders
    ADD COLUMN IF NOT EXISTS condominium_event_id UUID;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS orders
    ADD COLUMN IF NOT EXISTS condominium_name TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS orders
    ADD COLUMN IF NOT EXISTS condominium_event_title TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS orders
    ADD COLUMN IF NOT EXISTS condominium_fulfillment_mode TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS orders
    ADD COLUMN IF NOT EXISTS condominium_unit JSONB;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS orders
    DROP CONSTRAINT IF EXISTS chk_orders_fulfillment_mode;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS orders
    ADD CONSTRAINT chk_orders_fulfillment_mode
    CHECK (fulfillment_mode IN ('distance', 'postal', 'condominium_pickup', 'condominium_apartment'));
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_orders_condominium_id
    ON orders(condominium_id);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_orders_condominium_event_id
    ON orders(condominium_event_id);
  `);
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS condominiums (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      zip_code TEXT,
      lat NUMERIC(10,7),
      lng NUMERIC(10,7),
      logo_url TEXT,
      banner_url TEXT,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_condominiums_active
    ON condominiums(active);
  `);
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS condominium_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'CONDOMINIUM_ADMIN',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      last_login_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_condominium_users_condominium
    ON condominium_users(condominium_id);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_condominium_users_active
    ON condominium_users(active);
  `);
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS store_condominiums (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      schedule JSONB DEFAULT '[]'::jsonb,
      pickup_instructions TEXT,
      allow_pickup_at_stall BOOLEAN NOT NULL DEFAULT TRUE,
      allow_apartment_delivery BOOLEAN NOT NULL DEFAULT FALSE,
      apartment_delivery_fee NUMERIC(10,2),
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_store_condominiums_store_condominium UNIQUE (store_id, condominium_id)
    );
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_store_condominiums_condominium
    ON store_condominiums(condominium_id);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_store_condominiums_store
    ON store_condominiums(store_id);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_store_condominiums_active
    ON store_condominiums(active);
  `);
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS condominium_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled',
      starts_at TIMESTAMPTZ NOT NULL,
      ends_at TIMESTAMPTZ NOT NULL,
      pickup_location TEXT,
      notes TEXT,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_condominium_events_condominium
    ON condominium_events(condominium_id);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_condominium_events_window
    ON condominium_events(active, starts_at, ends_at);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_condominium_events_status
    ON condominium_events(status);
  `);
  await AppDataSource.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_condominium_events_condominium_start
    ON condominium_events(condominium_id, starts_at);
  `);
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS condominium_event_stores (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id UUID NOT NULL REFERENCES condominium_events(id) ON DELETE CASCADE,
      store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      allow_pickup_at_stall BOOLEAN NOT NULL DEFAULT TRUE,
      allow_apartment_delivery BOOLEAN NOT NULL DEFAULT FALSE,
      apartment_delivery_fee NUMERIC(10,2),
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_condominium_event_stores_event_store UNIQUE (event_id, store_id)
    );
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_condominium_event_stores_event
    ON condominium_event_stores(event_id);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_condominium_event_stores_store
    ON condominium_event_stores(store_id);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_condominium_event_stores_active
    ON condominium_event_stores(active);
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS condominium_event_stores
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'confirmed';
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS condominium_event_stores
    ADD COLUMN IF NOT EXISTS invited_by UUID;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS condominium_event_stores
    ADD COLUMN IF NOT EXISTS invite_note TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS condominium_event_stores
    ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_condominium_event_stores_status
    ON condominium_event_stores(status);
  `);
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS store_condominium_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      condominium_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending',
      message TEXT,
      review_note TEXT,
      reviewed_by UUID,
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_store_condominium_requests_store_condominium UNIQUE (store_id, condominium_id)
    );
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_store_condominium_requests_store
    ON store_condominium_requests(store_id);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_store_condominium_requests_condominium
    ON store_condominium_requests(condominium_id);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_store_condominium_requests_status
    ON store_condominium_requests(status);
  `);
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS motoboy_push_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      motoboy_id UUID NOT NULL REFERENCES motoboys(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL,
      platform TEXT NOT NULL DEFAULT 'android',
      app_version TEXT,
      device_model TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(token)
    );
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_motoboy_push_tokens_motoboy_id
    ON motoboy_push_tokens(motoboy_id);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_motoboy_push_tokens_user_id
    ON motoboy_push_tokens(user_id);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_motoboy_push_tokens_is_active
    ON motoboy_push_tokens(is_active);
  `);
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS store_user_push_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL,
      platform TEXT NOT NULL DEFAULT 'android',
      app_version TEXT,
      device_model TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(token)
    );
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_store_user_push_tokens_store_id
    ON store_user_push_tokens(store_id);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_store_user_push_tokens_user_id
    ON store_user_push_tokens(user_id);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_store_user_push_tokens_is_active
    ON store_user_push_tokens(is_active);
  `);
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS guest_order_phone_blocks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      phone_digits TEXT NOT NULL,
      reason TEXT,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_guest_order_phone_blocks_store_phone UNIQUE (store_id, phone_digits)
    );
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_guest_order_phone_blocks_store
    ON guest_order_phone_blocks(store_id);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_guest_order_phone_blocks_active
    ON guest_order_phone_blocks(active);
  `);
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS guest_order_attempts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      phone_digits TEXT,
      guest_push_id TEXT,
      ip_address TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_guest_order_attempts_store_created
    ON guest_order_attempts(store_id, created_at DESC);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_guest_order_attempts_phone
    ON guest_order_attempts(phone_digits);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_guest_order_attempts_guest
    ON guest_order_attempts(guest_push_id);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_guest_order_attempts_ip
    ON guest_order_attempts(ip_address);
  `);
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS customer_security_blocks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      email_snapshot TEXT,
      phone_snapshot TEXT,
      block_type VARCHAR(40) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      severity VARCHAR(20) NOT NULL DEFAULT 'soft',
      reason TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      blocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      blocked_until TIMESTAMPTZ,
      created_by TEXT,
      reviewed_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_customer_security_blocks_user_status
    ON customer_security_blocks(user_id, status, blocked_at DESC);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_customer_security_blocks_type
    ON customer_security_blocks(block_type);
  `);
  await AppDataSource.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
          FROM pg_constraint
         WHERE conname = 'chk_customer_security_blocks_status'
      ) THEN
        ALTER TABLE customer_security_blocks
          ADD CONSTRAINT chk_customer_security_blocks_status
          CHECK (status IN ('active', 'expired', 'revoked'));
      END IF;
    END $$;
  `);
  await AppDataSource.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
          FROM pg_constraint
         WHERE conname = 'chk_customer_security_blocks_type'
      ) THEN
        ALTER TABLE customer_security_blocks
          ADD CONSTRAINT chk_customer_security_blocks_type
          CHECK (block_type IN ('far_pickup_abuse', 'payment_abuse', 'identity_risk', 'manual_review', 'chargeback_risk'));
      END IF;
    END $$;
  `);
  await AppDataSource.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
          FROM pg_constraint
         WHERE conname = 'chk_customer_security_blocks_severity'
      ) THEN
        ALTER TABLE customer_security_blocks
          ADD CONSTRAINT chk_customer_security_blocks_severity
          CHECK (severity IN ('soft', 'hard'));
      END IF;
    END $$;
  `);
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS customer_risk_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      email_snapshot TEXT,
      phone_snapshot TEXT,
      event_type VARCHAR(60) NOT NULL,
      score NUMERIC(6,2) NOT NULL DEFAULT 0,
      ip_address TEXT,
      store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
      order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_customer_risk_events_user_created
    ON customer_risk_events(user_id, created_at DESC);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_customer_risk_events_event_type
    ON customer_risk_events(event_type);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_customer_risk_events_store
    ON customer_risk_events(store_id);
  `);
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS zip_code_cache (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      zip_code VARCHAR(8) NOT NULL UNIQUE,
      street TEXT,
      district TEXT,
      city TEXT,
      state VARCHAR(2),
      ibge_code TEXT,
      latitude NUMERIC(10,7),
      longitude NUMERIC(10,7),
      provider VARCHAR(40),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_zip_code_cache_zip_code
    ON zip_code_cache(zip_code);
  `);
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS store_dashboard_daily_metrics (
      store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      snapshot_date DATE NOT NULL,
      orders_count INT NOT NULL DEFAULT 0,
      revenue_total NUMERIC(10,2) NOT NULL DEFAULT 0,
      customers_count INT NOT NULL DEFAULT 0,
      first_order_at TIMESTAMPTZ,
      last_order_at TIMESTAMPTZ,
      source_updated_at TIMESTAMPTZ,
      refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT pk_store_dashboard_daily_metrics PRIMARY KEY (store_id, snapshot_date)
    );
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_store_dashboard_daily_metrics_store_date
    ON store_dashboard_daily_metrics(store_id, snapshot_date DESC);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_store_dashboard_daily_metrics_source_updated
    ON store_dashboard_daily_metrics(source_updated_at);
  `);
  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS store_dashboard_daily_products (
      store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      snapshot_date DATE NOT NULL,
      product_ref TEXT NOT NULL,
      product_id UUID,
      product_name TEXT NOT NULL,
      quantity INT NOT NULL DEFAULT 0,
      revenue_total NUMERIC(10,2) NOT NULL DEFAULT 0,
      source_updated_at TIMESTAMPTZ,
      refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT pk_store_dashboard_daily_products PRIMARY KEY (store_id, snapshot_date, product_ref)
    );
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_store_dashboard_daily_products_store_date
    ON store_dashboard_daily_products(store_id, snapshot_date DESC);
  `);
  await AppDataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_store_dashboard_daily_products_name
    ON store_dashboard_daily_products(product_name);
  `);
  await AppDataSource.query(`
    UPDATE store_settings
    SET delivery_radius_km = 5
    WHERE delivery_radius_km IS NULL
      AND COALESCE(order_types, '[]'::jsonb) @> '["delivery"]'::jsonb;
  `);
}
