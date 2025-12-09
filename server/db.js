import 'dotenv/config';
import pkg from 'pg';

const { Pool } = pkg;

export const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'espetinho'
});

pool.on('error', (err) => {
  console.error('Erro inesperado na pool do PostgreSQL', err);
  process.exit(-1);
});
