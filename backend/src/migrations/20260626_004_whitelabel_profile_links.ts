import type { SchemaMigration } from '../utils/migrationRunner';

const migration: SchemaMigration = {
  id: '20260626_004_whitelabel_profile_links',
  name: 'Backfill whitelabel_users profile links (Store/Motoboy/Partner)',
  checksumSource: `
    INSERT INTO whitelabel_users (...) SELECT owner_id,'STORE_OWNER','STORE',id FROM stores ... ON CONFLICT DO NOTHING;
    INSERT INTO whitelabel_users (...) SELECT user_id,'MOTOBOY','MOTOBOY',id FROM motoboys ... ON CONFLICT DO NOTHING;
    INSERT INTO whitelabel_users (...) SELECT user_id,'PARTNER','DESTINATION_PARTNER_ACCOUNT',id FROM destination_partner_accounts WHERE user_id IS NOT NULL ... ON CONFLICT DO NOTHING;
  `,
  async up(queryRunner) {
    // Store (dono) -> wl(STORE_OWNER, STORE, store.id)
    await queryRunner.query(`
      INSERT INTO whitelabel_users (user_id, role, profile_type, profile_id, status, created_at)
      SELECT s.owner_id, 'STORE_OWNER', 'STORE', s.id, 'active', NOW()
      FROM stores s
      WHERE s.owner_id IS NOT NULL
      ON CONFLICT DO NOTHING;
    `);
    // Motoboy -> wl(MOTOBOY, MOTOBOY, motoboy.id)
    await queryRunner.query(`
      INSERT INTO whitelabel_users (user_id, role, profile_type, profile_id, status, created_at)
      SELECT m.user_id, 'MOTOBOY', 'MOTOBOY', m.id, 'active', NOW()
      FROM motoboys m
      WHERE m.user_id IS NOT NULL
      ON CONFLICT DO NOTHING;
    `);
    // Partner (chalé/serviço) vinculado a um user -> wl(PARTNER, DESTINATION_PARTNER_ACCOUNT, account.id)
    await queryRunner.query(`
      INSERT INTO whitelabel_users (user_id, role, profile_type, profile_id, status, created_at)
      SELECT dpa.user_id, 'PARTNER', 'DESTINATION_PARTNER_ACCOUNT', dpa.id, 'active', NOW()
      FROM destination_partner_accounts dpa
      WHERE dpa.user_id IS NOT NULL
      ON CONFLICT DO NOTHING;
    `);
  },
};

export default migration;
