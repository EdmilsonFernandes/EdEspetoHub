import crypto from 'crypto';
import type { DataSource, QueryRunner } from 'typeorm';
import { schemaMigrations } from '../migrations';
import { logger as defaultLogger } from './logger';

const MIGRATION_LOCK_ID = 620261301;
const MIGRATION_ID_PATTERN = /^\d{8}_\d{3}_[a-z0-9_]+$/;

type MigrationLogger = Pick<typeof defaultLogger, 'info' | 'warn' | 'error'>;

export type SchemaMigration = {
  id: string;
  name: string;
  transaction?: boolean;
  checksumSource?: string;
  up: (queryRunner: QueryRunner) => Promise<void>;
};

export type AppliedSchemaMigration = {
  id: string;
  name: string;
  checksum: string;
  executed_at: Date | string;
  execution_ms: number;
  app_version: string | null;
  git_sha: string | null;
};

export type SchemaMigrationStatus = {
  applied: Array<AppliedSchemaMigration & { checksum_matches: boolean | null }>;
  pending: Array<{ id: string; name: string; checksum: string }>;
  unknownApplied: AppliedSchemaMigration[];
};

export type MigrationRunnerOptions = {
  appVersion?: string;
  gitSha?: string;
  logger?: MigrationLogger;
  migrations?: readonly SchemaMigration[];
  strictAppliedMigrationCheck?: boolean;
};

const checksumMigration = (migration: SchemaMigration) =>
  crypto
    .createHash('sha256')
    .update(
      [
        migration.id,
        migration.name,
        migration.transaction === false ? 'no-transaction' : 'transaction',
        migration.checksumSource || migration.up.toString(),
      ].join('\n')
    )
    .digest('hex');

const normalizeMigrations = (migrations: readonly SchemaMigration[]) => {
  const seen = new Set<string>();
  const normalized = [...migrations].sort((left, right) => left.id.localeCompare(right.id));

  for (const migration of normalized) {
    if (!MIGRATION_ID_PATTERN.test(migration.id)) {
      throw new Error(
        `Invalid schema migration id "${migration.id}". Use YYYYMMDD_NNN_short_name.`
      );
    }
    if (seen.has(migration.id)) {
      throw new Error(`Duplicate schema migration id "${migration.id}".`);
    }
    seen.add(migration.id);
  }

  return normalized.map((migration) => ({
    ...migration,
    checksum: checksumMigration(migration),
  }));
};

const getGitSha = () =>
  process.env.GIT_SHA ||
  process.env.COMMIT_SHA ||
  process.env.SOURCE_VERSION ||
  process.env.RENDER_GIT_COMMIT ||
  null;

const getAppVersion = () => process.env.APP_VERSION || process.env.npm_package_version || null;

const ensureMigrationTable = async (queryRunner: QueryRunner) => {
  await queryRunner.query(`
    CREATE TABLE IF NOT EXISTS app_schema_migrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      checksum TEXT NOT NULL,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      execution_ms INTEGER NOT NULL DEFAULT 0,
      app_version TEXT,
      git_sha TEXT
    );
  `);
  await queryRunner.query(`
    CREATE INDEX IF NOT EXISTS idx_app_schema_migrations_executed_at
    ON app_schema_migrations(executed_at DESC);
  `);
};

const readAppliedMigrations = async (queryRunner: QueryRunner) =>
  (await queryRunner.query(`
    SELECT id, name, checksum, executed_at, execution_ms, app_version, git_sha
    FROM app_schema_migrations
    ORDER BY id ASC;
  `)) as AppliedSchemaMigration[];

const insertAppliedMigration = async (
  queryRunner: QueryRunner,
  migration: SchemaMigration & { checksum: string },
  executionMs: number,
  appVersion: string | null,
  gitSha: string | null
) => {
  await queryRunner.query(
    `
      INSERT INTO app_schema_migrations (id, name, checksum, execution_ms, app_version, git_sha)
      VALUES ($1, $2, $3, $4, $5, $6);
    `,
    [migration.id, migration.name, migration.checksum, executionMs, appVersion, gitSha]
  );
};

const validateAppliedMigrations = (
  applied: AppliedSchemaMigration[],
  migrations: Array<SchemaMigration & { checksum: string }>,
  strictAppliedMigrationCheck: boolean
) => {
  const knownById = new Map(migrations.map((migration) => [migration.id, migration]));

  for (const row of applied) {
    const knownMigration = knownById.get(row.id);
    if (!knownMigration) {
      if (strictAppliedMigrationCheck) {
        throw new Error(
          `Database has applied schema migration "${row.id}", but this code version does not know it.`
        );
      }
      continue;
    }

    if (knownMigration.checksum !== row.checksum) {
      throw new Error(
        `Checksum mismatch for schema migration "${row.id}". Applied migrations are immutable.`
      );
    }
  }
};

const getTableExists = async (queryRunner: QueryRunner) => {
  const rows = (await queryRunner.query(
    `SELECT to_regclass('public.app_schema_migrations') AS table_name;`
  )) as Array<{ table_name: string | null }>;
  return Boolean(rows?.[0]?.table_name);
};

export async function getSchemaMigrationStatus(
  dataSource: DataSource,
  options: MigrationRunnerOptions = {}
): Promise<SchemaMigrationStatus> {
  const migrations = normalizeMigrations(options.migrations || schemaMigrations);
  const queryRunner = dataSource.createQueryRunner();

  await queryRunner.connect();
  try {
    const tableExists = await getTableExists(queryRunner);
    const applied = tableExists ? await readAppliedMigrations(queryRunner) : [];
    const knownById = new Map(migrations.map((migration) => [migration.id, migration]));
    const appliedById = new Map(applied.map((row) => [row.id, row]));

    return {
      applied: applied
        .filter((row) => knownById.has(row.id))
        .map((row) => ({
          ...row,
          checksum_matches: knownById.get(row.id)?.checksum === row.checksum,
        })),
      pending: migrations
        .filter((migration) => !appliedById.has(migration.id))
        .map((migration) => ({
          id: migration.id,
          name: migration.name,
          checksum: migration.checksum,
        })),
      unknownApplied: applied.filter((row) => !knownById.has(row.id)),
    };
  } finally {
    await queryRunner.release();
  }
}

export async function runAppMigrations(
  dataSource: DataSource,
  options: MigrationRunnerOptions = {}
) {
  const log = options.logger || defaultLogger.child({ scope: 'SchemaMigrationRunner' });
  const migrations = normalizeMigrations(options.migrations || schemaMigrations);
  const strictAppliedMigrationCheck =
    options.strictAppliedMigrationCheck ??
    process.env.SCHEMA_MIGRATION_STRICT_APPLIED_CHECK !== 'false';
  const appVersion = options.appVersion ?? getAppVersion();
  const gitSha = options.gitSha ?? getGitSha();
  const queryRunner = dataSource.createQueryRunner();

  await queryRunner.connect();
  await queryRunner.query(`SELECT pg_advisory_lock($1);`, [MIGRATION_LOCK_ID]);

  try {
    await ensureMigrationTable(queryRunner);

    const applied = await readAppliedMigrations(queryRunner);
    validateAppliedMigrations(applied, migrations, strictAppliedMigrationCheck);

    const appliedIds = new Set(applied.map((row) => row.id));
    const pending = migrations.filter((migration) => !appliedIds.has(migration.id));

    if (pending.length === 0) {
      log.info('Schema migrations are up to date');
      return;
    }

    log.info('Running schema migrations', { pending: pending.map((migration) => migration.id) });

    for (const migration of pending) {
      const startedAt = Date.now();
      const shouldUseTransaction = migration.transaction !== false;

      try {
        if (shouldUseTransaction) {
          await queryRunner.startTransaction();
        }

        await migration.up(queryRunner);

        await insertAppliedMigration(
          queryRunner,
          migration,
          Date.now() - startedAt,
          appVersion,
          gitSha
        );

        if (shouldUseTransaction) {
          await queryRunner.commitTransaction();
        }

        log.info('Schema migration applied', {
          id: migration.id,
          name: migration.name,
          executionMs: Date.now() - startedAt,
        });
      } catch (error) {
        if (shouldUseTransaction && queryRunner.isTransactionActive) {
          await queryRunner.rollbackTransaction().catch((rollbackError) => {
            log.error('Failed to rollback schema migration transaction', {
              id: migration.id,
              error: rollbackError,
            });
          });
        }

        log.error('Schema migration failed', { id: migration.id, error });
        throw error;
      }
    }
  } finally {
    await queryRunner.query(`SELECT pg_advisory_unlock($1);`, [MIGRATION_LOCK_ID]).catch((error) => {
      log.error('Failed to release schema migration advisory lock', { error });
    });
    await queryRunner.release();
  }
}
