import crypto from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateTotpSecret(bytes = 20) {
  return base32Encode(crypto.randomBytes(bytes));
}

export function base32Encode(buffer: Buffer) {
  let bits = '';
  let output = '';

  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, '0');
  }

  for (let index = 0; index < bits.length; index += 5) {
    const chunk = bits.slice(index, index + 5).padEnd(5, '0');
    output += BASE32_ALPHABET[parseInt(chunk, 2)];
  }

  return output;
}

export function base32Decode(value: string) {
  const clean = String(value || '')
    .replace(/=+$/g, '')
    .replace(/\s+/g, '')
    .toUpperCase();

  let bits = '';
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error('Invalid base32 value.');
    }
    bits += index.toString(2).padStart(5, '0');
  }

  const bytes: number[] = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) {
    bytes.push(parseInt(bits.slice(offset, offset + 8), 2));
  }

  return Buffer.from(bytes);
}

export function buildOtpAuthUri(params: {
  issuer: string;
  accountName: string;
  secret: string;
  algorithm?: 'SHA1';
  digits?: number;
  period?: number;
}) {
  const issuer = params.issuer || 'Ja no Caminho';
  const accountName = params.accountName || 'conta';
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  const query = new URLSearchParams({
    secret: params.secret,
    issuer,
    algorithm: params.algorithm || 'SHA1',
    digits: String(params.digits || 6),
    period: String(params.period || 30),
  });

  return `otpauth://totp/${label}?${query.toString()}`;
}

export function generateTotpCode(secret: string, options?: { timeMs?: number; period?: number; digits?: number }) {
  const period = options?.period || 30;
  const digits = options?.digits || 6;
  const counter = Math.floor((options?.timeMs ?? Date.now()) / 1000 / period);
  return generateHotpCode(secret, counter, digits);
}

export function verifyTotpCode(
  secret: string,
  token: string,
  options?: { timeMs?: number; period?: number; digits?: number; window?: number }
) {
  const cleanToken = String(token || '').replace(/\D/g, '');
  const digits = options?.digits || 6;
  if (cleanToken.length !== digits) return false;

  const period = options?.period || 30;
  const timeMs = options?.timeMs ?? Date.now();
  const window = options?.window ?? 1;
  const baseCounter = Math.floor(timeMs / 1000 / period);

  for (let drift = -window; drift <= window; drift += 1) {
    const expected = generateHotpCode(secret, baseCounter + drift, digits);
    if (timingSafeEqual(cleanToken, expected)) {
      return true;
    }
  }

  return false;
}

function generateHotpCode(secret: string, counter: number, digits: number) {
  const key = base32Decode(secret);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  counterBuffer.writeUInt32BE(counter >>> 0, 4);

  const hmac = crypto.createHmac('sha1', key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(binary % 10 ** digits).padStart(digits, '0');
}

function timingSafeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
