import type { SchemaMigration } from '../utils/migrationRunner';

const migration: SchemaMigration = {
  id: '20260625_001_partner_account_user_link',
  name: 'Link destination partner accounts/requests to users (unified login)',
  checksumSource: `
    ALTER TABLE destination_partner_accounts ADD COLUMN IF NOT EXISTS user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE destination_partner_requests ADD COLUMN IF NOT EXISTS user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_destination_partner_accounts_user_id ON destination_partner_accounts(user_id) WHERE user_id IS NOT NULL;
  `,
  async up(queryRunner) {
    await queryRunner.query(`ALTER TABLE destination_partner_accounts ADD COLUMN IF NOT EXISTS user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL;`);
    await queryRunner.query(`ALTER TABLE destination_partner_requests ADD COLUMN IF NOT EXISTS user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL;`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_destination_partner_accounts_user_id ON destination_partner_accounts(user_id) WHERE user_id IS NOT NULL;`);
  },
};

export default migration;
