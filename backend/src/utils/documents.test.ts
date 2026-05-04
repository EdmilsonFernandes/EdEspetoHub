import { describe, it, expect } from 'vitest';
import { normalizeDocument, validateDocument } from './documents';

describe('documents', () => {
  describe('normalizeDocument', () => {
    it('removes non-digits', () => {
      expect(normalizeDocument('123.456.789-09')).toBe('12345678909');
    });

    it('returns empty for undefined', () => {
      expect(normalizeDocument(undefined)).toBe('');
    });
  });

  describe('validateDocument — CPF', () => {
    it('valid CPF passes', () => {
      expect(validateDocument('52998224725', 'CPF')).toBe(true);
    });

    it('invalid CPF fails', () => {
      expect(validateDocument('12345678900', 'CPF')).toBe(false);
    });

    it('repeated digits fail', () => {
      expect(validateDocument('11111111111', 'CPF')).toBe(false);
    });

    it('wrong length fails', () => {
      expect(validateDocument('123', 'CPF')).toBe(false);
    });
  });

  describe('validateDocument — CNPJ', () => {
    it('valid CNPJ passes', () => {
      expect(validateDocument('11222333000181', 'CNPJ')).toBe(true);
    });

    it('invalid CNPJ fails', () => {
      expect(validateDocument('11222333000100', 'CNPJ')).toBe(false);
    });

    it('repeated digits fail', () => {
      expect(validateDocument('11111111111111', 'CNPJ')).toBe(false);
    });
  });

  describe('validateDocument — unknown type', () => {
    it('returns false', () => {
      expect(validateDocument('12345678909', 'RG')).toBe(false);
    });
  });
});
