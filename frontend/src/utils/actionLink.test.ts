import { describe, expect, it } from 'vitest';
import { resolveActionTarget } from './actionLink';

describe('resolveActionTarget', () => {
  it('treats relative app routes as internal', () => {
    expect(resolveActionTarget('/create?plan=trial')).toEqual({
      href: '/create?plan=trial',
      external: false,
    });
  });

  it('treats https urls as external', () => {
    expect(resolveActionTarget('https://example.com/promo')).toEqual({
      href: 'https://example.com/promo',
      external: true,
    });
  });

  it('falls back when empty', () => {
    expect(resolveActionTarget('   ')).toEqual({
      href: '/create?plan=trial',
      external: false,
    });
  });
});
