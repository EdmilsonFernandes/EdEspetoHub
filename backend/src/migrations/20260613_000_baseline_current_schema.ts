import type { SchemaMigration } from '../utils/migrationRunner';

const requiredTables = [
  'users',
  'stores',
  'store_settings',
  'products',
  'orders',
  'order_items',
  'site_settings',
];

const baselineCurrentSchema: SchemaMigration = {
  id: '20260613_000_baseline_current_schema',
  name: 'Baseline current production schema',
  checksumSource: `required_tables:${requiredTables.join(',')}`,
  async up(queryRunner) {
    const rows = (await queryRunner.query(
      `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = ANY($1::text[]);
      `,
      [requiredTables]
    )) as Array<{ table_name: string }>;

    const existingTables = new Set(rows.map((row) => row.table_name));
    const missingTables = requiredTables.filter((tableName) => !existingTables.has(tableName));

    if (missingTables.length > 0) {
      throw new Error(
        `Baseline schema migration cannot be recorded. Missing tables: ${missingTables.join(', ')}.`
      );
    }
  },
};

export default baselineCurrentSchema;
