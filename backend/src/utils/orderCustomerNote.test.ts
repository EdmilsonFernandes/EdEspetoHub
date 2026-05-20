import { describe, expect, it } from 'vitest';
import { CUSTOMER_ORDER_NOTE_MAX_LENGTH, normalizeCustomerOrderNote } from './orderCustomerNote';

describe('normalizeCustomerOrderNote', () => {
  it('trims and keeps useful customer instructions', () => {
    expect(normalizeCustomerOrderNote('  sem ketchup, avisar quando chegar  ')).toBe(
      'sem ketchup, avisar quando chegar'
    );
  });

  it('returns null for empty notes', () => {
    expect(normalizeCustomerOrderNote('   ')).toBeNull();
    expect(normalizeCustomerOrderNote(null)).toBeNull();
  });

  it('limits the note length to protect queue payloads', () => {
    const note = 'a'.repeat(CUSTOMER_ORDER_NOTE_MAX_LENGTH + 20);

    expect(normalizeCustomerOrderNote(note)).toHaveLength(CUSTOMER_ORDER_NOTE_MAX_LENGTH);
  });
});
