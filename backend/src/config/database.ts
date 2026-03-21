import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env } from './env';
import path from 'path';

// Detect if we are running in development (ts) or production (dist/js)
const isTs = !__dirname.includes('dist');
const extension = isTs ? 'ts' : 'js';

// Base directory for entities
const entitiesPath = path.join(__dirname, '..', 'entities', '**', `*.${extension}`);

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: env.database.host,
  port: env.database.port,
  username: env.database.username,
  password: env.database.password,
  database: env.database.database,
  synchronize: false,
  entities: [ entitiesPath ],
  migrations: [],
  logging: [ 'error' ]
});
