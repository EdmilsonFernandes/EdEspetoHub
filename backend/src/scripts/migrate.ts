import 'reflect-metadata';
import 'dotenv/config';

async function main() {
  const { loadSsmEnv } = await import('../config/ssm');
  await loadSsmEnv();

  const { ensureBaseSchema, ensureDatabaseExists, getEnvDbConn } = await import('../utils/dbBootstrap');
  const { AppDataSource } = await import('../config/database');
  const { runMigrations } = await import('../utils/runMigrations');

  await ensureDatabaseExists(getEnvDbConn());
  await AppDataSource.initialize();

  try {
    await ensureBaseSchema(AppDataSource);
    await runMigrations();
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

main().catch((error) => {
  console.error('Migration failed', error);
  process.exitCode = 1;
});
