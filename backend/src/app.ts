import 'reflect-metadata';
import express from 'express';
import path from 'path';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { loadSsmEnv } from './config/ssm';

async function bootstrap()
{
  await loadSsmEnv();
  const { AppDataSource } = await import('./config/database');
  const routes = (await import('./routes')).default;
  const { env } = await import('./config/env');
  const { swaggerSpec } = await import('./config/swagger');
  const { scheduleSubscriptionExpirationJob } = await import('./jobs/subscription-expiration.job');
  const { runMigrations } = await import('./utils/runMigrations');
  const { requestLogger } = await import('./middleware/requestLogger');
  const { logger } = await import('./utils/logger');

  await AppDataSource.initialize();
  await runMigrations();
  const app = express();
  app.use(requestLogger);
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  const uploadsDir = path.join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsDir));

  app.get('/', (_, res) => res.json({ status: 'ok', name: 'Churras Sites API' }));
  app.use('/api/docs', swaggerUi.serve as any, swaggerUi.setup(swaggerSpec) as any);
  app.get('/api/docs.json', (_, res) => res.json(swaggerSpec));

  app.use('/api', routes);

  scheduleSubscriptionExpirationJob();

  app.listen(env.port, () =>
  {
    logger.info('API listening', { port: env.port });
  });
}

bootstrap().catch((error) =>
{
  logger.error('Failed to start API', { error });
  process.exit(1);
});
