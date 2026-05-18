import { describe, expect, it } from 'vitest';
import { base32Decode, base32Encode, buildOtpAuthUri, generateTotpCode, verifyTotpCode } from './totp';

describe('totp utils', () => {
  it('roundtrips base32 values', () => {
    const original = Buffer.from('Ja no Caminho MFA');
    const encoded = base32Encode(original);

    expect(base32Decode(encoded).toString()).toBe(original.toString());
  });

  it('generates and verifies a time-based code within the accepted window', () => {
    const secret = base32Encode(Buffer.from('12345678901234567890'));
    const timeMs = Date.UTC(2026, 4, 18, 12, 0, 0);
    const code = generateTotpCode(secret, { timeMs });

    expect(code).toMatch(/^\d{6}$/);
    expect(verifyTotpCode(secret, code, { timeMs })).toBe(true);
    expect(verifyTotpCode(secret, code, { timeMs: timeMs + 90_000 })).toBe(false);
  });

  it('builds an authenticator-compatible otpauth uri', () => {
    const uri = buildOtpAuthUri({
      issuer: 'Ja no Caminho',
      accountName: 'admin@janocaminho.com.br',
      secret: 'JBSWY3DPEHPK3PXP',
    });

    expect(uri).toContain('otpauth://totp/');
    expect(uri).toContain('issuer=Ja+no+Caminho');
    expect(uri).toContain('secret=JBSWY3DPEHPK3PXP');
  });
});
