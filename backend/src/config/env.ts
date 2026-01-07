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
  },
  database: {
    host: process.env.PGHOST || 'localhost',
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
    username: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'espetinho',
  },
};
