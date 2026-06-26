/**
 * Script standalone (re-rodável, idempotente) que migra usuários antigos para
 * o padrão de identidade unificada: popula user_identifiers (EMAIL/CPF) e
 * user_documents (CPF/CNPJ) a partir da tabela users existente.
 *
 * TRANSPARENTE: não mexe em senha/login — só cria os identificadores/docs.
 * Roda dentro do container: `node dist/scripts/backfillUserIdentity.js`
 * (ou via yarn/ts-node em dev). Seguro rodar várias vezes (ON CONFLICT DO NOTHING).
 */
import { AppDataSource } from '../config/database';

async function countRows(label: string, sql: string, params: any[] = []) {
  const rows = await AppDataSource.query(sql, params);
  const value = Array.isArray(rows) ? Number(rows[0]?.count ?? 0) : 0;
  console.log(`[backfill] ${label}: ${value}`);
  return value;
}

async function main() {
  console.log('[backfill] conectando ao banco…');
  await AppDataSource.initialize();

  // ── user_identifiers ──
  await AppDataSource.query(`
    INSERT INTO user_identifiers (user_id, type, value, verified, created_at)
    SELECT u.id, 'EMAIL', lower(u.email), COALESCE(u.email_verified, false), NOW()
    FROM users u
    WHERE u.email IS NOT NULL AND trim(u.email) <> ''
    ON CONFLICT (type, value) DO NOTHING;
  `);
  await AppDataSource.query(`
    INSERT INTO user_identifiers (user_id, type, value, verified, created_at)
    SELECT u.id, 'CPF', regexp_replace(u.document, '\\D', '', 'g'), COALESCE(u.email_verified, false), NOW()
    FROM users u
    WHERE u.document IS NOT NULL AND trim(u.document) <> ''
      AND length(regexp_replace(u.document, '\\D', '', 'g')) IN (11, 14)
    ON CONFLICT (type, value) DO NOTHING;
  `);

  // ── user_documents (CPF/CNPJ) ──
  await AppDataSource.query(`
    INSERT INTO user_documents (user_id, type, value, verified, created_at, updated_at)
    SELECT u.id, 'CPF', regexp_replace(u.document, '\\D', '', 'g'), false, NOW(), NOW()
    FROM users u
    WHERE u.document IS NOT NULL AND trim(u.document) <> ''
      AND length(regexp_replace(u.document, '\\D', '', 'g')) = 11
    ON CONFLICT (type, value) DO NOTHING;
  `);
  await AppDataSource.query(`
    INSERT INTO user_documents (user_id, type, value, verified, created_at, updated_at)
    SELECT u.id, 'CNPJ', regexp_replace(u.document, '\\D', '', 'g'), false, NOW(), NOW()
    FROM users u
    WHERE u.document IS NOT NULL AND trim(u.document) <> ''
      AND length(regexp_replace(u.document, '\\D', '', 'g')) = 14
    ON CONFLICT (type, value) DO NOTHING;
  `);

  // ── relatório ──
  console.log('[backfill] concluído. Totais atuais:');
  await countRows('users', `SELECT count(*)::int AS count FROM users`);
  await countRows('user_identifiers EMAIL', `SELECT count(*)::int AS count FROM user_identifiers WHERE type='EMAIL'`);
  await countRows('user_identifiers CPF', `SELECT count(*)::int AS count FROM user_identifiers WHERE type='CPF'`);
  await countRows('user_documents CPF', `SELECT count(*)::int AS count FROM user_documents WHERE type='CPF'`);
  await countRows('user_documents CNPJ', `SELECT count(*)::int AS count FROM user_documents WHERE type='CNPJ'`);

  await AppDataSource.destroy();
  console.log('[backfill] desconectado.');
}

main().catch((error) => {
  console.error('[backfill] FALHOU:', error);
  process.exit(1);
});
