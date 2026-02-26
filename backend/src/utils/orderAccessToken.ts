import crypto from 'crypto';
import { env } from '../config/env';

type OrderAccessPayload = {
  oid: string;
  exp: number;
};

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const base64UrlEncode = (input: string) =>
  Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const base64UrlDecode = (input: string) => {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 ? '='.repeat(4 - (normalized.length % 4)) : '';
  return Buffer.from(`${normalized}${padding}`, 'base64').toString('utf8');
};

const sign = (payloadB64: string) =>
  crypto
    .createHmac('sha256', `${env.jwtSecret}:order-access`)
    .update(payloadB64)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

export const createOrderAccessToken = (orderId: string) => {
  const payload: OrderAccessPayload = {
    oid: String(orderId || ''),
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  return `${payloadB64}.${sign(payloadB64)}`;
};

export const verifyOrderAccessToken = (token: string, orderId: string) => {
  if (!token || !orderId) return false;
  const [payloadB64, providedSig] = String(token).split('.');
  if (!payloadB64 || !providedSig) return false;
  const expectedSig = sign(payloadB64);
  if (providedSig !== expectedSig) return false;
  try {
    const payload = JSON.parse(base64UrlDecode(payloadB64)) as OrderAccessPayload;
    if (!payload?.oid || payload.oid !== String(orderId)) return false;
    if (!payload?.exp || Number(payload.exp) < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
};

