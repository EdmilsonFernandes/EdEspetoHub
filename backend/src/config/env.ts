/*
 * Chama no espeto CONFIDENTIAL
 * ------------------
 * Copyright (C) 2025 Chama no espeto - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Chama no espeto.
 *
 * @file: env.ts
 * @Date: 2025-12-17
 * @author: Edmilson Lopes (edmilson.lopes@chamanoespeto.com.br)
 */

import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: process.env.PORT ? Number(process.env.PORT) : 4000,
  jwtSecret: process.env.JWT_SECRET || 'super-secret-token',
  appUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
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
    webhookSecret: process.env.MP_WEBHOOK_SECRET || '',
    apiBaseUrl: process.env.MP_API_BASE_URL || 'https://api.mercadopago.com',
    webhookUrl: process.env.MP_WEBHOOK_URL || '',
    debug: process.env.MP_DEBUG === 'true',
  },
  email: {
    from: process.env.EMAIL_FROM || 'Chama no Espeto <no-reply@chamanoespeto.com>',
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    smtpSecure: process.env.SMTP_SECURE === 'true',
    notifyOnSignup: process.env.NOTIFY_ON_SIGNUP_EMAILS || '',
  },
  database: {
    host: process.env.PGHOST || 'localhost',
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
    username: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'espetinho',
  },
  etaV2: {
    enabled: process.env.ENABLE_ORDER_ETA_V2 === 'true',
    mapsBaseUrl: process.env.MAPS_BASE_URL || 'http://maps:5050/api/maps',
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
};
