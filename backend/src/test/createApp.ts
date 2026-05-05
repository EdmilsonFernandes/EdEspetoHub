import 'reflect-metadata';
import express from 'express';
import path from 'path';
import cors from 'cors';
import { publicUploadsMiddleware } from '../middleware/publicUploads';
import routes from '../routes';

/**
 * Creates an Express app without SSM, jobs, or listen.
 * Used by tests (supertest) and can be reused by app.ts in the future.
 */
export function createApp(): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('etag', false);
  app.use(cors({ origin: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use('/uploads', publicUploadsMiddleware, express.static(path.join(process.cwd(), 'uploads')));
  app.get('/', (_, res) => res.json({ status: 'ok' }));
  app.use('/api', routes);
  return app;
}
