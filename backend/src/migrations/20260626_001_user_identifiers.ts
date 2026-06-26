import type { SchemaMigration } from '../utils/migrationRunner';

const migration: SchemaMigration = {
  id: '20260626_001_user_identifiers',
  name: 'Create user_identifiers (unified identity matching)',
  checksumSource: `
    CREATE TABLE IF NOT EXISTS user_identifiers (...);
    CREATE UNIQUE INDEX IF NOT EXISTS uq_user_identifiers_type_value ON user_identifiers(type, value);
    CREATE INDEX IF NOT EXISTS idx_user_identifiers_user_id ON user_identifiers(user_id);
    INSERT INTO user_identifiers (user_id, type, value, verified) SELECT ... FROM users ... ON CONFLICT DO NOTHING;
  `,
  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_identifiers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        value TEXT NOT NULL,
        verified BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    // Um identificador (email/cpf/cnpj) aponta pra exatamente UM user.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_user_identifiers_type_value
      ON user_identifiers(type, value);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_user_identifiers_user_id
      ON user_identifiers(user_id);
    `);

    // Backfill transparente: popula identifiers dos users existentes.
    // EMAIL = lower(email); CPF = só dígitos do document. Idempotente (ON CONFLICT).
    await queryRunner.query(`
      INSERT INTO user_identifiers (user_id, type, value, verified, created_at)
      SELECT u.id, 'EMAIL', lower(u.email), COALESCE(u.email_verified, false), NOW()
      FROM users u
      WHERE u.email IS NOT NULL AND trim(u.email) <> ''
      ON CONFLICT (type, value) DO NOTHING;
    `);
    await queryRunner.query(`
      INSERT INTO user_identifiers (user_id, type, value, verified, created_at)
      SELECT u.id, 'CPF', regexp_replace(u.document, '\\D', '', 'g'), COALESCE(u.email_verified, false), NOW()
      FROM users u
      WHERE u.document IS NOT NULL AND trim(u.document) <> ''
      ON CONFLICT (type, value) DO NOTHING;
    `);
  },
};

export default migration;
