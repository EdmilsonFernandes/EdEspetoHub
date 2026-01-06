import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: process.env.PORT ? Number(process.env.PORT) : 4000,
  jwtSecret: process.env.JWT_SECRET || 'super-secret-token',
  appUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
  superAdminEmail: process.env.SUPER_ADMIN_EMAIL || '',
  superAdminPassword: process.env.SUPER_ADMIN_PASSWORD || '',
  mercadoPago: {
    accessToken: process.env.MP_ACCESS_TOKEN || 'TEST-6483127096011967-010608-b32b7cd5ddd0b80f3e81696ef5e2823f-198026375',
    publicKey: process.env.MP_PUBLIC_KEY || 'TEST-bcf19d97-748a-4f07-96bf-7e905be5a4cb',
    webhookSecret: process.env.MP_WEBHOOK_SECRET || '1d39b0d27c80f07a39631e9830d79caa3081b1d281099603cded3f4e1a2b0609',
    apiBaseUrl: process.env.MP_API_BASE_URL || 'https://api.mercadopago.com',
    webhookUrl: process.env.MP_WEBHOOK_URL || 'https://elian-unrazored-nilda.ngrok-free.dev/api/webhooks/mercadopago',
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
