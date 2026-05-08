import { describe, it, expect } from 'vitest';

function generateConfirmationCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function validateCode(stored: string | null | undefined, input: string | null | undefined): { ok: boolean; error?: string } {
  if (!stored) return { ok: true }; // no code required
  if (!input || String(input).trim() !== String(stored)) {
    return { ok: false, error: 'Código de confirmação incorreto.' };
  }
  return { ok: true };
}

describe('Delivery — confirmation code', () => {
  describe('generateConfirmationCode', () => {
    it('generates a 4-digit string', () => {
      const code = generateConfirmationCode();
      expect(code).toHaveLength(4);
      expect(Number(code)).toBeGreaterThanOrEqual(1000);
      expect(Number(code)).toBeLessThanOrEqual(9999);
    });

    it('generates different codes', () => {
      const codes = new Set(Array.from({ length: 20 }, generateConfirmationCode));
      expect(codes.size).toBeGreaterThan(1);
    });
  });

  describe('validateCode', () => {
    it('passes when no code is stored (legacy orders)', () => {
      expect(validateCode(null, null).ok).toBe(true);
      expect(validateCode(undefined, '1234').ok).toBe(true);
    });

    it('passes when code matches', () => {
      expect(validateCode('7284', '7284').ok).toBe(true);
    });

    it('fails when code does not match', () => {
      const result = validateCode('7284', '1111');
      expect(result.ok).toBe(false);
      expect(result.error).toContain('incorreto');
    });

    it('fails when no code provided but one is required', () => {
      const result = validateCode('7284', null);
      expect(result.ok).toBe(false);
    });

    it('fails when empty string provided', () => {
      const result = validateCode('7284', '');
      expect(result.ok).toBe(false);
    });

    it('trims whitespace from input', () => {
      expect(validateCode('7284', ' 7284 ').ok).toBe(true);
    });
  });
});
