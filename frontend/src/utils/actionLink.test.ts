import { describe, expect, it } from 'vitest';
import { resolveActionLabel, resolveActionTarget } from './actionLink';

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

  it('infers a smart label for external app links', () => {
    expect(resolveActionLabel('', 'https://play.google.com/store/apps/details?id=com.example.app')).toBe(
      'Baixar na Play Store'
    );
  });

  it('preserves a custom label when provided', () => {
    expect(resolveActionLabel('Ver promoção', 'https://example.com')).toBe('Ver promoção');
  });
});
