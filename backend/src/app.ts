import 'reflect-metadata';
import express from 'express';
import path from 'path';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { AppDataSource } from './config/database';
import routes from './routes';
import { env } from './config/env';
import { swaggerSpec } from './config/swagger';
import { scheduleSubscriptionExpirationJob } from './jobs/subscription-expiration.job';
import { runMigrations } from './utils/runMigrations';
import { requestLogger } from './middleware/requestLogger';
import { logger } from './utils/logger';

async function bootstrap()
{
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
