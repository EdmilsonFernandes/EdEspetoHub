import { describe, expect, it } from 'vitest';
import { getMessage } from '../i18n';

describe('i18n order messages', () => {
  it('has a specific message for insufficient stock errors', () => {
    expect(getMessage('ORDER-005', 'pt')).toContain('estoque');
    expect(getMessage('ORDER-005', 'en')).toContain('stock');
  });
});
