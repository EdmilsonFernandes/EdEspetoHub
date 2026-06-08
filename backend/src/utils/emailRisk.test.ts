import { describe, it, expect } from 'vitest';
import {
  extractEmailDomain,
  getEmailDomainTypoMessage,
  getEmailDomainTypoSuggestion,
  isAllowlistedEmail,
  isDisposableEmailDomain,
} from './emailRisk';

describe('emailRisk', () => {
  describe('extractEmailDomain', () => {
    it('extracts domain', () => {
      expect(extractEmailDomain('user@gmail.com')).toBe('gmail.com');
    });

    it('returns empty for null', () => {
      expect(extractEmailDomain(null)).toBe('');
    });

    it('returns empty for invalid', () => {
      expect(extractEmailDomain('noemail')).toBe('');
    });

    it('lowercases domain', () => {
      expect(extractEmailDomain('User@GMAIL.COM')).toBe('gmail.com');
    });
  });

  describe('isDisposableEmailDomain', () => {
    it('detects built-in disposable', () => {
      expect(isDisposableEmailDomain('test@mailinator.com')).toBe(true);
      expect(isDisposableEmailDomain('test@yopmail.com')).toBe(true);
    });

    it('allows normal domains', () => {
      expect(isDisposableEmailDomain('test@gmail.com')).toBe(false);
    });

    it('detects extra domains', () => {
      expect(isDisposableEmailDomain('test@custom-temp.io', ['custom-temp.io'])).toBe(true);
    });
  });

  describe('getEmailDomainTypoSuggestion', () => {
    it('suggests correction for common provider typo', () => {
      expect(getEmailDomainTypoSuggestion('cliente@gmail.come')).toEqual({
        domain: 'gmail.come',
        suggestedDomain: 'gmail.com',
        suggestedEmail: 'cliente@gmail.com',
      });
    });

    it('does not flag valid domains', () => {
      expect(getEmailDomainTypoSuggestion('cliente@gmail.com')).toBeNull();
      expect(getEmailDomainTypoSuggestion('contato@minhaloja.com.br')).toBeNull();
    });

    it('builds a human message', () => {
      expect(getEmailDomainTypoMessage('cliente@gmial.com')).toContain('cliente@gmail.com');
    });
  });

  describe('isAllowlistedEmail', () => {
    it('matches allowlisted email', () => {
      expect(isAllowlistedEmail('admin@loja.com', ['admin@loja.com'])).toBe(true);
    });

    it('case insensitive', () => {
      expect(isAllowlistedEmail('Admin@Loja.COM', ['admin@loja.com'])).toBe(true);
    });

    it('returns false when not listed', () => {
      expect(isAllowlistedEmail('other@loja.com', ['admin@loja.com'])).toBe(false);
    });
  });
});
