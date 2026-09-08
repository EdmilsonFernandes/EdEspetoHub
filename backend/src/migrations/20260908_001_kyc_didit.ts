import type { SchemaMigration } from '../utils/migrationRunner';

/**
 * KYC Didit direto (08/09): formaliza as colunas de vínculo de identidade do
 * motoboy (kyc_cpf/kyc_birth_date — gravadas no primeiro KYC, travam a
 * identidade nas verificações seguintes) e rebranda os docs do piloto Jano
 * (doc_type KYC_JANO → KYC_DIDIT) para que nada fique órfão nas filas quando
 * o código Jano sair. As colunas eram DDL inline no runMigrations (piloto);
 * aqui viram migration formal idempotente — DBs dev que rodaram o inline são
 * no-ops, prod nunca rodou.
 */
const migration: SchemaMigration = {
  id: '20260908_001_kyc_didit',
  name: 'kyc: colunas kyc_cpf/kyc_birth_date + docs KYC_JANO→KYC_DIDIT',
  async up(queryRunner) {
    await queryRunner.query(`ALTER TABLE motoboys ADD COLUMN IF NOT EXISTS kyc_cpf TEXT`);
    await queryRunner.query(`ALTER TABLE motoboys ADD COLUMN IF NOT EXISTS kyc_birth_date TEXT`);
    // Docs do piloto Jano → provedor Didit (só existem em DBs dev; WHERE torna idempotente).
    await queryRunner.query(`
      UPDATE motoboy_documents
      SET metadata = jsonb_set(metadata - 'jano', '{didit}', jsonb_build_object(
            'sessionId', COALESCE(metadata->'jano'->>'verificationId', ''),
            'url', COALESCE(metadata->'jano'->>'captureUrl', ''),
            'status', COALESCE(metadata->'jano'->>'status', 'migrated'),
            'migratedFrom', 'jano'
          ))
      WHERE doc_type = 'KYC_JANO' AND metadata ? 'jano'
    `);
    await queryRunner.query(`
      UPDATE motoboy_documents
      SET doc_type = 'KYC_DIDIT', file_key = 'didit:hosted'
      WHERE doc_type = 'KYC_JANO'
    `);
  },
};

export default migration;
