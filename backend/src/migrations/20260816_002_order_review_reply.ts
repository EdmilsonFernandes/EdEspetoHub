import type { SchemaMigration } from '../utils/migrationRunner';

const migration: SchemaMigration = {
  id: '20260816_002_order_review_reply',
  name: 'Add store reply to order reviews',
  checksumSource: `
    ALTER TABLE order_reviews ADD COLUMN IF NOT EXISTS store_reply TEXT;
    ALTER TABLE order_reviews ADD COLUMN IF NOT EXISTS store_replied_at TIMESTAMPTZ;
  `,
  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE order_reviews
        ADD COLUMN IF NOT EXISTS store_reply TEXT;
      ALTER TABLE order_reviews
        ADD COLUMN IF NOT EXISTS store_replied_at TIMESTAMPTZ;
    `);
  },
};

export default migration;
