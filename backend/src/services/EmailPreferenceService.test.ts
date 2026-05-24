import { describe, expect, it } from 'vitest';
import { EmailPreferenceService } from './EmailPreferenceService';

describe('EmailPreferenceService', () => {
  it('creates and validates signed unsubscribe tokens', () => {
    const service = new EmailPreferenceService();
    const token = service.createUnsubscribeToken('CLIENTE@EXEMPLO.COM', 'marketing');
    const parsed = service.parseUnsubscribeToken(token);

    expect(parsed).toEqual({
      email: 'cliente@exemplo.com',
      category: 'marketing',
    });
  });

  it('rejects tampered unsubscribe tokens', () => {
    const service = new EmailPreferenceService();
    const token = service.createUnsubscribeToken('cliente@exemplo.com', 'marketing');

    expect(() => service.parseUnsubscribeToken(`${token}x`)).toThrow('email_unsubscribe_invalid_token');
  });
});
