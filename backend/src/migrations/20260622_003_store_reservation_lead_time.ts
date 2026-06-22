import type { SchemaMigration } from '../utils/migrationRunner';

const migration: SchemaMigration = {
  id: '20260622_003_store_reservation_lead_time',
  name: 'Add reservation lead time hours to store settings',
  checksumSource: `
    ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS reservation_lead_time_hours INT NULL;
  `,
  async up(queryRunner) {
    await queryRunner.query(`ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS reservation_lead_time_hours INT NULL;`);
  },
};

export default migration;
