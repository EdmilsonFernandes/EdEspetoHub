import { AppDataSource } from '../config/database';

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
    ALTER TABLE IF EXISTS orders
    ADD COLUMN IF NOT EXISTS table_number TEXT;
  `);
  await AppDataSource.query(`
    ALTER TABLE IF EXISTS products
    ADD COLUMN IF NOT EXISTS description TEXT;
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
}
