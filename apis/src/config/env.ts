import 'dotenv/config';
function required(key: string): string { const v = process.env[key]; if (!v) throw new Error(`Missing env: ${key}`); return v; }
export const env = { port: parseInt(process.env.PORT ?? '5000', 10), backendUrl: required('BACKEND_URL'), jwtSecret: required('JWT_SECRET'), nodeEnv: process.env.NODE_ENV ?? 'development' } as const;
