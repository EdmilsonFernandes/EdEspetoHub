import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function resetDatabase() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(sql);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  resetDatabase()
    .then(() => {
      console.log('Banco resetado e populado com dados iniciais.');
    })
    .catch((err) => {
      console.error('Falha ao resetar banco:', err.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
