import type { SchemaMigration } from '../utils/migrationRunner';

const migration: SchemaMigration = {
  id: '20260622_002_store_reservation_capacity',
  name: 'Add reservation capacity to store settings',
  checksumSource: `
    ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS reservation_capacity INT NULL;
  `,
  async up(queryRunner) {
    await queryRunner.query(`ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS reservation_capacity INT NULL;`);
  },
};

export default migration;
