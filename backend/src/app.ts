import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { AppDataSource } from './config/database';
import routes from './routes';
import { env } from './config/env';
import { swaggerSpec } from './config/swagger';

async function bootstrap() {
  await AppDataSource.initialize();
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/', (_, res) => res.json({ status: 'ok', name: 'Churras Sites API' }));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api/docs.json', (_, res) => res.json(swaggerSpec));
  app.use('/api', routes);

  app.listen(env.port, () => {
    console.log(`API listening on port ${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start API', error);
  process.exit(1);
});
