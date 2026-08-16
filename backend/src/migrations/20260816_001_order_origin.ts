import type { SchemaMigration } from '../utils/migrationRunner';

const migration: SchemaMigration = {
  id: '20260816_001_order_origin',
  name: 'Add order origin (staff/app/web) for queue badge',
  checksumSource: `
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS origin VARCHAR(12);
  `,
  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS origin VARCHAR(12);
    `);
  },
};

export default migration;
