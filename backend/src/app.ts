/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: app.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import 'reflect-metadata';
import 'dotenv/config';
import express from 'express';
import path from 'path';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { loadSsmEnv } from './config/ssm';
/**
 * Handles bootstrap.
 *
 * @author Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 * @date 2025-12-17
 */
async function bootstrap()
{
  await loadSsmEnv();
  const { ensureBaseSchema, ensureDatabaseExists, getEnvDbConn } = await import('./utils/dbBootstrap');
  const { AppDataSource } = await import('./config/database');
  const routes = (await import('./routes')).default;
  const { env } = await import('./config/env');
  const { validateCriticalRuntimeConfig } = await import('./config/runtimeValidation');
	  const { swaggerSpec } = await import('./config/swagger');
	  const { scheduleSubscriptionExpirationJob } = await import('./jobs/subscription-expiration.job');
	  const { scheduleDeliveryExpirationJob } = await import('./jobs/delivery-expiration.job');
	  const { scheduleFaceVerifyJob } = await import('./jobs/face-verify.job');
	  const { scheduleAwaitingPaymentExpirationJob } = await import('./jobs/awaiting-payment-expiration.job');
	  const { scheduleStoreDashboardSnapshotJob } = await import('./jobs/store-dashboard-snapshot.job');
	  const { runMigrations } = await import('./utils/runMigrations');
  const { publicUploadsMiddleware } = await import('./middleware/publicUploads');
  const { applyApiSecurityHeaders } = await import('./middleware/apiSecurity');
  const { requestLogger } = await import('./middleware/requestLogger');
  const { accessLogger } = await import('./middleware/accessLogger');
  const { logger } = await import('./utils/logger');

  validateCriticalRuntimeConfig();

  // Auto-heal: if the database was dropped, recreate it so the API can boot.
  // Retry because on docker starts Postgres may not be ready yet.
  {
    const conn = getEnvDbConn();
    const maxAttempts = process.env.DB_BOOTSTRAP_ATTEMPTS ? Number(process.env.DB_BOOTSTRAP_ATTEMPTS) : 25;
    const baseDelayMs = process.env.DB_BOOTSTRAP_DELAY_MS ? Number(process.env.DB_BOOTSTRAP_DELAY_MS) : 1000;

    let lastError: any = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await ensureDatabaseExists(conn);
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        const delay = Math.min(15000, baseDelayMs * attempt);
        logger.warn('DB bootstrap attempt failed, retrying', {
          attempt,
          maxAttempts,
          delayMs: delay,
          error: (error as any)?.message || String(error),
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    if (lastError) {
      throw lastError;
    }
  }

  await AppDataSource.initialize();
  // If the DB exists but is empty, apply the base schema before running migrations.
  await ensureBaseSchema(AppDataSource);
  await runMigrations();
  const { cacheService } = await import('./services/CacheService');
  await cacheService.initialize();
  const app = express();
  const corsAllowedOrigins = new Set(env.corsAllowedOrigins);
  // API endpoints are dynamic; avoid 304/ETag cache surprises in browsers/proxies.
  app.disable('x-powered-by');
  app.set('etag', false);
  app.set('trust proxy', env.trustProxyHops);
  app.use(applyApiSecurityHeaders);
  app.use(requestLogger);
  app.use((req, res, next) =>
  {
    const origin = String(req.headers.origin || '').trim();
    if (!origin || corsAllowedOrigins.has(origin)) {
      return next();
    }

    return res.status(403).json({
      code: 'CORS_NOT_ALLOWED',
      message: 'Origem não permitida.',
    });
  });
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || corsAllowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Requested-With', 'X-Signature', 'X-Request-Id'],
    exposedHeaders: ['Retry-After'],
    optionsSuccessStatus: 204,
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(accessLogger);
  // Avoid browser/proxy caching for dynamic APIs (prevents 304 "Not Modified" hiding new queue/orders).
  app.use((req, res, next) =>
  {
    if (req.path.startsWith('/api/motoboy') || req.path.startsWith('/api/stores') || req.path.startsWith('/api/orders')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
    }
    next();
  });

  const uploadsDir = path.join(process.cwd(), 'uploads');
  app.use('/uploads', publicUploadsMiddleware, express.static(uploadsDir));

  app.get('/', (_, res) => res.json({ status: 'ok', name: 'Churras Sites API' }));
  app.use('/api/docs', swaggerUi.serve as any, swaggerUi.setup(swaggerSpec) as any);
  app.get('/api/docs.json', (_, res) => res.json(swaggerSpec));

  // ── Redirects permanentes de slug de loja (21/08) ──────────────────────────
  // Na produção o nginx da EC2 manda /api DIRETO pra cá (bypassa BFF e nginx do
  // front) — o redirect de API mora AQUI. 308 preserva método+body: drafts de
  // checkout no localStorage que ainda chamam o slug antigo seguem funcionando.
  const STORE_SLUG_REDIRECTS: Record<string, string> = {
    edsertaneja: 'espetinho-datony-bacabal',
  };
  const storeSlugRedirectRegex = /^\/(api\/(?:public\/)?stores\/slug\/)([^/?]+)(\/[^?]*)?/;
  app.use((req, res, next) => {
    const match = storeSlugRedirectRegex.exec(req.originalUrl.split('?')[0]);
    if (!match) return next();
    const target = STORE_SLUG_REDIRECTS[match[2]];
    if (!target) return next();
    const queryString = req.originalUrl.includes('?') ? `?${req.originalUrl.split('?')[1]}` : '';
    res.redirect(308, `/${match[1]}${target}${match[3] || ''}${queryString}`);
  });

  app.use('/api', routes);

	  scheduleSubscriptionExpirationJob();
	  scheduleDeliveryExpirationJob();
	  scheduleFaceVerifyJob();
	  scheduleAwaitingPaymentExpirationJob();
	  scheduleStoreDashboardSnapshotJob();

  const server = app.listen(env.port, () =>
  {
    logger.info('API listening', {
      port: env.port,
      trustProxyHops: env.trustProxyHops,
      corsAllowedOrigins: env.corsAllowedOrigins,
      strictRuntimeValidation: env.security.strictRuntimeValidation,
    });
  });

  // Graceful shutdown: disconnect Redis before exiting
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully...`);
    server.close();
    try {
      const { cacheService } = await import('./services/CacheService');
      await cacheService.disconnect();
    } catch { /* ignore */ }
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

bootstrap().catch((error) =>
{
  console.error('Failed to start API', error);
  process.exit(1);
});
