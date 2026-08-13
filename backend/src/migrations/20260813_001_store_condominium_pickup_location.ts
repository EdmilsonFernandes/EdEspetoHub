import type { SchemaMigration } from '../utils/migrationRunner';

const migration: SchemaMigration = {
  id: '20260813_001_store_condominium_pickup_location',
  name: 'Add vendor pickup location (block/unit) to store condominium links',
  checksumSource: `
    ALTER TABLE store_condominiums ADD COLUMN IF NOT EXISTS pickup_block TEXT;
    ALTER TABLE store_condominiums ADD COLUMN IF NOT EXISTS pickup_unit TEXT;
  `,
  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE store_condominiums
        ADD COLUMN IF NOT EXISTS pickup_block TEXT,
        ADD COLUMN IF NOT EXISTS pickup_unit TEXT;
    `);
  },
};

export default migration;
