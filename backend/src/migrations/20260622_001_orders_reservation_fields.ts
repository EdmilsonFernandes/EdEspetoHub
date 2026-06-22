import type { SchemaMigration } from '../utils/migrationRunner';

const migration: SchemaMigration = {
  id: '20260622_001_orders_reservation_fields',
  name: 'Add reservation fields to orders',
  checksumSource: `
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ NULL;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS party_size INT NULL;
  `,
  async up(queryRunner) {
    await queryRunner.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ NULL;`);
    await queryRunner.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS party_size INT NULL;`);
  },
};

export default migration;
