import 'reflect-metadata';
import 'dotenv/config';

async function main() {
  const { loadSsmEnv } = await import('../config/ssm');
  await loadSsmEnv();

  const { AppDataSource } = await import('../config/database');
  const { getSchemaMigrationStatus } = await import('../utils/migrationRunner');

  await AppDataSource.initialize();

  try {
    const status = await getSchemaMigrationStatus(AppDataSource);

    console.log(
      JSON.stringify(
        {
          applied: status.applied.map((row) => ({
            id: row.id,
            name: row.name,
            executed_at: row.executed_at,
            checksum_matches: row.checksum_matches,
          })),
          pending: status.pending.map((migration) => ({
            id: migration.id,
            name: migration.name,
          })),
          unknown_applied: status.unknownApplied.map((row) => ({
            id: row.id,
            name: row.name,
            executed_at: row.executed_at,
          })),
        },
        null,
        2
      )
    );
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

main().catch((error) => {
  console.error('Migration status failed', error);
  process.exitCode = 1;
});
