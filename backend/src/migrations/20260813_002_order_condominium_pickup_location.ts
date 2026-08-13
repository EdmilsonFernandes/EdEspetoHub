import type { SchemaMigration } from '../utils/migrationRunner';

const migration: SchemaMigration = {
  id: '20260813_002_order_condominium_pickup_location',
  name: 'Add permanent condominium pickup location to orders',
  checksumSource: `
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS condominium_pickup_location TEXT;
  `,
  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS condominium_pickup_location TEXT;
    `);
  },
};

export default migration;
