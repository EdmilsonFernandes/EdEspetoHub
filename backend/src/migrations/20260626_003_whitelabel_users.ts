import type { SchemaMigration } from '../utils/migrationRunner';

const migration: SchemaMigration = {
  id: '20260626_003_whitelabel_users',
  name: 'Create whitelabel_users (multi-role registry per user)',
  checksumSource: `
    CREATE TABLE IF NOT EXISTS whitelabel_users (...);
    CREATE UNIQUE INDEX ... ON whitelabel_users(user_id, role) WHERE profile_id IS NULL;
    CREATE UNIQUE INDEX ... ON whitelabel_users(user_id, role, profile_id) WHERE profile_id IS NOT NULL;
    INSERT INTO whitelabel_users (...) SELECT ... FROM users ... ON CONFLICT DO NOTHING;
  `,
  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS whitelabel_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        profile_type TEXT,
        profile_id UUID,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    // Um papel sem perfil (ex: CUSTOMER) é único por user; um papel com perfil
    // (ex: PARTNER + chalé X) é único por (user, role, profile).
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_whitelabel_users_user_role_noprofile
      ON whitelabel_users(user_id, role) WHERE profile_id IS NULL;
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_whitelabel_users_user_role_profile
      ON whitelabel_users(user_id, role, profile_id) WHERE profile_id IS NOT NULL;
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_whitelabel_users_user_id ON whitelabel_users(user_id);`);

    // Backfill transparente: cada user ganha 1 wl entry com seu userRole atual.
    // (Vínculo de perfis — Store/Motoboy/Partner — vem na Fase D.)
    await queryRunner.query(`
      INSERT INTO whitelabel_users (user_id, role, profile_type, profile_id, status, created_at)
      SELECT u.id, u.user_role, NULL, NULL, 'active', NOW()
      FROM users u
      WHERE u.user_role IS NOT NULL AND trim(u.user_role) <> ''
      ON CONFLICT DO NOTHING;
    `);
  },
};

export default migration;
