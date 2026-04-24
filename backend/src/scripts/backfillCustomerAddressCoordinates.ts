import 'reflect-metadata';
import 'dotenv/config';
import { loadSsmEnv } from '../config/ssm';

async function bootstrap() {
  await loadSsmEnv();
  const { ensureBaseSchema, ensureDatabaseExists, getEnvDbConn } = await import('../utils/dbBootstrap');
  const { AppDataSource } = await import('../config/database');
  const { runMigrations } = await import('../utils/runMigrations');
  const { CustomerAccountService } = await import('../services/CustomerAccountService');

  const rawLimit = process.argv.find((entry) => entry.startsWith('--limit='))?.split('=')[1];
  const limit = Number.isFinite(Number(rawLimit)) ? Number(rawLimit) : 5000;

  await ensureDatabaseExists(getEnvDbConn());
  await AppDataSource.initialize();
  await ensureBaseSchema(AppDataSource);
  await runMigrations();

  try {
    const service = new CustomerAccountService();
    const result = await service.backfillMissingAddressCoordinates(limit);
    console.info('Customer address coordinate backfill finished', result);
  } finally {
    await AppDataSource.destroy().catch(() => undefined);
  }
}

bootstrap().catch((error) => {
  console.error('Customer address coordinate backfill failed', error);
  process.exit(1);
});
