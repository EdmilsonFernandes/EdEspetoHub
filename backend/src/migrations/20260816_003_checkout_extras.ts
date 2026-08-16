import type { SchemaMigration } from '../utils/migrationRunner';

const migration: SchemaMigration = {
  id: '20260816_003_checkout_extras',
  name: 'Checkout extras: CPF na nota, observacao por item e cupons',
  checksumSource: `
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_id VARCHAR(20);
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(40);
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_discount NUMERIC(10,2);
    ALTER TABLE order_items ADD COLUMN IF NOT EXISTS note VARCHAR(280);
    CREATE TABLE IF NOT EXISTS coupons (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      code VARCHAR(40) NOT NULL,
      discount_type VARCHAR(12) NOT NULL DEFAULT 'percent',
      discount_value NUMERIC(10,2) NOT NULL,
      min_subtotal NUMERIC(10,2),
      expires_at TIMESTAMPTZ,
      max_uses INT,
      used_count INT NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS uq_coupons_store_code ON coupons(store_id, code);
  `,
  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS tax_id VARCHAR(20);
      ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(40);
      ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS coupon_discount NUMERIC(10,2);
      ALTER TABLE order_items
        ADD COLUMN IF NOT EXISTS note VARCHAR(280);
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        code VARCHAR(40) NOT NULL,
        discount_type VARCHAR(12) NOT NULL DEFAULT 'percent',
        discount_value NUMERIC(10,2) NOT NULL,
        min_subtotal NUMERIC(10,2),
        expires_at TIMESTAMPTZ,
        max_uses INT,
        used_count INT NOT NULL DEFAULT 0,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_coupons_store_code ON coupons(store_id, code);
    `);
  },
};

export default migration;
