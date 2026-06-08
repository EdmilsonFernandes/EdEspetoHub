import { describe, expect, it } from 'vitest';
import { getEmailDomainTypoMessage, getEmailValidationMessage } from './emailValidation';

describe('emailValidation', () => {
  it('suggests gmail.com when user types gmail.come', () => {
    expect(getEmailDomainTypoMessage('cliente@gmail.come')).toContain('cliente@gmail.com');
    expect(getEmailValidationMessage('cliente@gmail.come')).toContain('cliente@gmail.com');
  });

  it('allows valid custom and common domains', () => {
    expect(getEmailValidationMessage('cliente@gmail.com')).toBe('');
    expect(getEmailValidationMessage('contato@minhaloja.com.br')).toBe('');
  });

  it('rejects malformed email', () => {
    expect(getEmailValidationMessage('cliente-sem-email')).toBe('Informe um e-mail válido.');
  });
});
