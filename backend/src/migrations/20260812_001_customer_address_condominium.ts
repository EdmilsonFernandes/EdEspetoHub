import type { SchemaMigration } from '../utils/migrationRunner';

const migration: SchemaMigration = {
  id: '20260812_001_customer_address_condominium',
  name: 'Add optional condominium link to customer addresses',
  checksumSource: `
    ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS condominium_id UUID REFERENCES condominiums(id) ON DELETE SET NULL;
    ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS condominium_block TEXT;
    ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS condominium_unit TEXT;
    CREATE INDEX IF NOT EXISTS idx_customer_addresses_condominium ON customer_addresses(condominium_id) WHERE condominium_id IS NOT NULL;
  `,
  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE customer_addresses
        ADD COLUMN IF NOT EXISTS condominium_id UUID REFERENCES condominiums(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS condominium_block TEXT,
        ADD COLUMN IF NOT EXISTS condominium_unit TEXT;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_addresses_condominium
      ON customer_addresses(condominium_id)
      WHERE condominium_id IS NOT NULL;
    `);
  },
};

export default migration;
