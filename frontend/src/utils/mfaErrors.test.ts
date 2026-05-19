import { describe, expect, it } from 'vitest';
import { isMfaChallengeExpiredError } from './mfaErrors';

describe('mfaErrors', () => {
  it('detects expired MFA challenges by backend code', () => {
    expect(isMfaChallengeExpiredError({ code: 'MFA-002', message: 'invalid' })).toBe(true);
    expect(isMfaChallengeExpiredError({ code: 'MFA-003', message: 'too many attempts' })).toBe(true);
  });

  it('does not classify regular invalid codes as expired', () => {
    expect(isMfaChallengeExpiredError({ code: 'MFA-001', message: 'Código inválido.' })).toBe(false);
  });
});
