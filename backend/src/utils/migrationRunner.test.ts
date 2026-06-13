import type { DataSource, QueryRunner } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { runAppMigrations, type AppliedSchemaMigration, type SchemaMigration } from './migrationRunner';

class FakeQueryRunner {
  applied = new Map<string, AppliedSchemaMigration>();
  isTransactionActive = false;
  connect = vi.fn(async () => {});
  release = vi.fn(async () => {});
  startTransaction = vi.fn(async () => {
    this.isTransactionActive = true;
  });
  commitTransaction = vi.fn(async () => {
    this.isTransactionActive = false;
  });
  rollbackTransaction = vi.fn(async () => {
    this.isTransactionActive = false;
  });
  extraQueries: string[] = [];

  async query(sql: string, params: unknown[] = []) {
    const normalizedSql = sql.replace(/\s+/g, ' ').trim().toLowerCase();
    this.extraQueries.push(normalizedSql);

    if (normalizedSql.includes('select id, name, checksum')) {
      return [...this.applied.values()].sort((left, right) => left.id.localeCompare(right.id));
    }

    if (normalizedSql.includes('insert into app_schema_migrations')) {
      const [id, name, checksum, executionMs, appVersion, gitSha] = params as [
        string,
        string,
        string,
        number,
        string | null,
        string | null,
      ];
      this.applied.set(id, {
        id,
        name,
        checksum,
        executed_at: new Date().toISOString(),
        execution_ms: executionMs,
        app_version: appVersion,
        git_sha: gitSha,
      });
      return [];
    }

    return [];
  }
}

const createDataSource = (queryRunner: FakeQueryRunner) =>
  ({
    createQueryRunner: () => queryRunner as unknown as QueryRunner,
  }) as DataSource;

const testLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

const createMigration = (
  id: string,
  checksumSource: string,
  up: SchemaMigration['up'] = async () => {}
): SchemaMigration => ({
  id,
  name: `Migration ${id}`,
  checksumSource,
  up,
});

describe('migration runner', () => {
  it('runs pending migrations once and records them', async () => {
    const queryRunner = new FakeQueryRunner();
    const runCount = vi.fn();
    const migration = createMigration('20260613_001_test_migration', 'v1', async () => {
      runCount();
    });

    await runAppMigrations(createDataSource(queryRunner), {
      logger: testLogger,
      migrations: [migration],
      strictAppliedMigrationCheck: true,
    });
    await runAppMigrations(createDataSource(queryRunner), {
      logger: testLogger,
      migrations: [migration],
      strictAppliedMigrationCheck: true,
    });

    expect(runCount).toHaveBeenCalledTimes(1);
    expect(queryRunner.applied.has(migration.id)).toBe(true);
    expect(queryRunner.startTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
  });

  it('rejects changes to an applied migration checksum', async () => {
    const queryRunner = new FakeQueryRunner();

    await runAppMigrations(createDataSource(queryRunner), {
      logger: testLogger,
      migrations: [createMigration('20260613_001_test_migration', 'v1')],
      strictAppliedMigrationCheck: true,
    });

    await expect(
      runAppMigrations(createDataSource(queryRunner), {
        logger: testLogger,
        migrations: [createMigration('20260613_001_test_migration', 'v2')],
        strictAppliedMigrationCheck: true,
      })
    ).rejects.toThrow(/checksum mismatch/i);
  });

  it('rolls back a failed transactional migration and does not record it', async () => {
    const queryRunner = new FakeQueryRunner();
    const migration = createMigration('20260613_001_test_migration', 'v1', async () => {
      throw new Error('DDL failed');
    });

    await expect(
      runAppMigrations(createDataSource(queryRunner), {
        logger: testLogger,
        migrations: [migration],
        strictAppliedMigrationCheck: true,
      })
    ).rejects.toThrow(/DDL failed/);

    expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.applied.has(migration.id)).toBe(false);
  });

  it('supports migrations that must run outside a transaction', async () => {
    const queryRunner = new FakeQueryRunner();
    const migration: SchemaMigration = {
      ...createMigration('20260613_001_test_migration', 'v1'),
      transaction: false,
    };

    await runAppMigrations(createDataSource(queryRunner), {
      logger: testLogger,
      migrations: [migration],
      strictAppliedMigrationCheck: true,
    });

    expect(queryRunner.startTransaction).not.toHaveBeenCalled();
    expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
    expect(queryRunner.applied.has(migration.id)).toBe(true);
  });
});
