import type { SchemaMigration } from '../utils/migrationRunner';

const migration: SchemaMigration = {
  id: '20260626_002_user_documents',
  name: 'Create user_documents (centralized CPF/CNPJ KYC)',
  checksumSource: `
    CREATE TABLE IF NOT EXISTS user_documents (...);
    CREATE UNIQUE INDEX IF NOT EXISTS uq_user_documents_type_value ON user_documents(type, value);
    INSERT INTO user_documents (...) SELECT ... FROM users ... ON CONFLICT DO NOTHING;
  `,
  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        value TEXT NOT NULL,
        file_url TEXT,
        verified BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    // Um documento (CPF/CNPJ) aponta pra UM user.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_user_documents_type_value
      ON user_documents(type, value);
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON user_documents(user_id);`);

    // Backfill transparente: CPF existente em users.document -> user_documents.
    // CPF = 11 dígitos; CNPJ = 14. Só migra se bater o tamanho.
    await queryRunner.query(`
      INSERT INTO user_documents (user_id, type, value, verified, created_at, updated_at)
      SELECT u.id, 'CPF', regexp_replace(u.document, '\\D', '', 'g'), false, NOW(), NOW()
      FROM users u
      WHERE u.document IS NOT NULL AND trim(u.document) <> ''
        AND length(regexp_replace(u.document, '\\D', '', 'g')) = 11
      ON CONFLICT (type, value) DO NOTHING;
    `);
    await queryRunner.query(`
      INSERT INTO user_documents (user_id, type, value, verified, created_at, updated_at)
      SELECT u.id, 'CNPJ', regexp_replace(u.document, '\\D', '', 'g'), false, NOW(), NOW()
      FROM users u
      WHERE u.document IS NOT NULL AND trim(u.document) <> ''
        AND length(regexp_replace(u.document, '\\D', '', 'g')) = 14
      ON CONFLICT (type, value) DO NOTHING;
    `);
  },
};

export default migration;
