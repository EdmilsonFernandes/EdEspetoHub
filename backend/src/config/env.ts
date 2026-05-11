/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: env.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@janocaminho.com.br)
 */

import dotenv from 'dotenv';

dotenv.config();

const numberEnv = (name: string, fallback: number, min = 0) => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= min ? value : fallback;
};

const listEnv = (name: string) => {
  const raw = process.env[name];
  if (!raw) return [] as string[];
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
};

const normalizeEnum = <T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T => {
  const normalized = String(value || '').trim().toLowerCase();
  return (allowed as readonly string[]).includes(normalized) ? (normalized as T) : fallback;
};

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const expandWebOrigins = (origin: string) => {
  const normalized = String(origin || '').trim();
  if (!normalized) return [] as string[];

  const origins = new Set<string>([normalized]);
  try {
    const url = new URL(normalized);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      if (url.hostname.startsWith('www.')) {
        origins.add(`${url.protocol}//${url.hostname.slice(4)}${url.port ? `:${url.port}` : ''}`);
      } else if (url.hostname.includes('.')) {
        origins.add(`${url.protocol}//www.${url.hostname}${url.port ? `:${url.port}` : ''}`);
      }
    }
  } catch {
    // Ignore malformed URLs here; runtime validation will catch strict cases.
  }

  return Array.from(origins);
};

const appUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
const configuredCorsOrigins = [
  ...expandWebOrigins(appUrl),
  ...listEnv('CORS_ALLOWED_ORIGINS').flatMap(expandWebOrigins),
];

const defaultCorsOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost',
  'http://127.0.0.1',
  'capacitor://localhost',
  'ionic://localhost',
];

const defaultPublicUploadFolders = ['products', 'logos', 'condominiums', 'payment'];
const configuredPublicUploadFolders = listEnv('PUBLIC_UPLOADS_FOLDERS').map((value) => value.toLowerCase());

export const env = {
  port: process.env.PORT ? Number(process.env.PORT) : 4000,
  jwtSecret: process.env.JWT_SECRET || 'super-secret-token',
  appUrl,
  nodeEnv: String(process.env.NODE_ENV || 'development').toLowerCase(),
  trustProxyHops: numberEnv('TRUST_PROXY_HOPS', 1, 0),
  corsAllowedOrigins: Array.from(new Set([ ...configuredCorsOrigins, ...defaultCorsOrigins ])),
  superAdminEmail: process.env.SUPER_ADMIN_EMAIL || '',
  superAdminPassword: process.env.SUPER_ADMIN_PASSWORD || '',
  pendingSignupTtlDays: (() => {
    const raw = process.env.PENDING_SIGNUP_TTL_DAYS;
    if (!raw) return 7;
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : 7;
  })(),
  trialDays: (() => {
    const raw = process.env.TRIAL_DAYS;
    if (!raw) return 7;
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : 7;
  })(),
  firstMonthPromoPrice: (() => {
    const raw = process.env.FIRST_MONTH_PROMO_PRICE;
    if (!raw) return 14.9;
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : 14.9;
  })(),
  mercadoPago: {
    accessToken: process.env.MP_ACCESS_TOKEN || '',
    publicKey: process.env.MP_PUBLIC_KEY || '',
    clientId: process.env.MP_CLIENT_ID || '',
    clientSecret: process.env.MP_CLIENT_SECRET || '',
    oauthRedirectUrl: (process.env.MP_OAUTH_REDIRECT_URL || '').replace('https://www.', 'https://'),
    encryptionKey: process.env.MP_OAUTH_ENCRYPTION_KEY || '',
    webhookSecret: process.env.MP_WEBHOOK_SECRET || '',
    apiBaseUrl: process.env.MP_API_BASE_URL || 'https://api.mercadopago.com',
    webhookUrl: (process.env.MP_WEBHOOK_URL || '').replace('https://www.', 'https://'),
    debug: process.env.MP_DEBUG === 'true',
  },
  email: {
    from: process.env.EMAIL_FROM || 'Já no Caminho <no-reply@janocaminho.com.br>',
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    smtpSecure: process.env.SMTP_SECURE === 'true',
    notifyOnSignup: process.env.NOTIFY_ON_SIGNUP_EMAILS || '',
    auditInbox: process.env.AUDIT_NOTIFICATION_EMAIL || 'edmls2008@gmail.com',
  },
  database: {
    host: process.env.PGHOST || 'localhost',
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
    username: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'espetinho',
    poolMax: numberEnv('DB_POOL_MAX', 10, 1),
    poolIdleTimeoutMs: numberEnv('DB_POOL_IDLE_TIMEOUT_MS', 30000, 1000),
    poolConnectionTimeoutMs: numberEnv('DB_POOL_CONNECTION_TIMEOUT_MS', 5000, 1000),
    statementTimeoutMs: numberEnv('DB_STATEMENT_TIMEOUT_MS', 15000, 0),
    idleInTransactionSessionTimeoutMs: numberEnv('DB_IDLE_IN_TRANSACTION_TIMEOUT_MS', 10000, 0),
  },
  etaV2: {
    enabled: process.env.ENABLE_ORDER_ETA_V2 !== 'false',
    defaultPrepMinutes: process.env.DEFAULT_PREP_MINUTES ? Number(process.env.DEFAULT_PREP_MINUTES) : 15,
    defaultPrepPerItemMinutes: process.env.DEFAULT_PREP_PER_ITEM_MINUTES
      ? Number(process.env.DEFAULT_PREP_PER_ITEM_MINUTES)
      : 2,
    defaultQueueMinutesPerOrder: process.env.DEFAULT_QUEUE_MINUTES_PER_ORDER
      ? Number(process.env.DEFAULT_QUEUE_MINUTES_PER_ORDER)
      : 5,
    defaultQueueBufferMinutes: process.env.DEFAULT_QUEUE_BUFFER_MINUTES
      ? Number(process.env.DEFAULT_QUEUE_BUFFER_MINUTES)
      : 0,
    defaultEtaBufferMinutes: process.env.DEFAULT_ETA_BUFFER_MINUTES
      ? Number(process.env.DEFAULT_ETA_BUFFER_MINUTES)
      : 3,
  },
  delivery: {
    defaultRadiusKm: numberEnv('DEFAULT_DELIVERY_RADIUS_KM', 5, 1),
    minRadiusKm: numberEnv('MIN_DELIVERY_RADIUS_KM', 1, 1),
    maxRadiusKm: numberEnv('MAX_DELIVERY_RADIUS_KM', 30, 1),
  },
  pickup: {
    warningDistanceKm: numberEnv('PICKUP_DISTANCE_WARNING_KM', 15, 1),
    confirmationDistanceKm: numberEnv('PICKUP_DISTANCE_CONFIRMATION_KM', 40, 1),
    maxOpenLocalOrdersForFarPickup: numberEnv('MAX_OPEN_FAR_PICKUP_LOCAL_ORDERS', 1, 1),
  },
  addressLookup: {
    enableCoordinateFallback:
      process.env.ENABLE_FREE_GEOCODING_FALLBACK === 'true' ||
      process.env.ENABLE_OPENSTREETMAP_GEOCODING_FALLBACK === 'true' ||
      process.env.ENABLE_GOOGLE_GEOCODING_FALLBACK === 'true',
  },
  whatsapp: {
    notifyUrl: process.env.WHATSAPP_NOTIFY_URL || '',
  },
  shipping: {
    provider: String(process.env.SHIPPING_PROVIDER || 'internal').toLowerCase(),
    strictProvider: process.env.SHIPPING_STRICT_PROVIDER === 'true',
  },
  melhorEnvio: {
    baseUrl: process.env.MELHOR_ENVIO_BASE_URL || 'https://sandbox.melhorenvio.com.br',
    accessToken: process.env.MELHOR_ENVIO_ACCESS_TOKEN || '',
    clientId: process.env.MELHOR_ENVIO_CLIENT_ID || '',
    clientSecret: process.env.MELHOR_ENVIO_CLIENT_SECRET || '',
    refreshToken: process.env.MELHOR_ENVIO_REFRESH_TOKEN || '',
  },
  push: {
    fcmServerKey: process.env.FCM_SERVER_KEY || process.env.MOBILE_FCM_SERVER_KEY || '',
    fcmProjectId: process.env.FCM_PROJECT_ID || '',
    fcmServiceAccountPath: process.env.FCM_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
    fcmServiceAccountJson: process.env.FCM_SERVICE_ACCOUNT_JSON || '',
  },
  security: {
    authRateLimitWindowMs: numberEnv('AUTH_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000, 1000),
    authRateLimitMax: numberEnv('AUTH_RATE_LIMIT_MAX', 25, 1),
    recoveryRateLimitWindowMs: numberEnv('AUTH_RECOVERY_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000, 1000),
    recoveryRateLimitMax: numberEnv('AUTH_RECOVERY_RATE_LIMIT_MAX', 10, 1),
    disposableEmailDomains: listEnv('DISPOSABLE_EMAIL_DOMAINS').map((value) => value.toLowerCase()),
    allowlistedEmails: listEnv('SECURITY_EMAIL_ALLOWLIST').map((value) => value.toLowerCase()),
    customerRapidPickupWindowMinutes: numberEnv('CUSTOMER_RAPID_PICKUP_WINDOW_MINUTES', 15, 1),
    customerRapidPickupAutoBlockAfterEvents: numberEnv('CUSTOMER_RAPID_PICKUP_AUTO_BLOCK_AFTER_EVENTS', 2, 2),
    customerRapidPickupAutoBlockWindowHours: numberEnv('CUSTOMER_RAPID_PICKUP_AUTO_BLOCK_WINDOW_HOURS', 24, 1),
    customerRapidPickupBlockDurationHours: numberEnv('CUSTOMER_RAPID_PICKUP_BLOCK_DURATION_HOURS', 12, 1),
    strictRuntimeValidation:
      process.env.REQUIRE_STRICT_RUNTIME_VALIDATION === 'true' ||
      Boolean(process.env.SSM_PARAMETER_NAME) ||
      /^https:\/\//i.test(appUrl),
  },
  storage: {
    publicUploadsMode: normalizeEnum(process.env.PUBLIC_UPLOADS_STORAGE_MODE, ['local', 'hybrid', 's3'], 'local'),
    publicUploadsS3Bucket: process.env.PUBLIC_UPLOADS_S3_BUCKET || '',
    publicUploadsS3Region: process.env.PUBLIC_UPLOADS_S3_REGION || process.env.AWS_REGION || '',
    publicUploadsS3Prefix: trimTrailingSlash(process.env.PUBLIC_UPLOADS_S3_PREFIX || 'uploads').replace(/^\/+/, ''),
    publicUploadsBaseUrl: trimTrailingSlash(process.env.PUBLIC_UPLOADS_BASE_URL || ''),
    publicUploadsDebugLog: process.env.PUBLIC_UPLOADS_DEBUG_LOG === 'true',
    publicFolders: configuredPublicUploadFolders.length ? configuredPublicUploadFolders : defaultPublicUploadFolders,
  },
};
