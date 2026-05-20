import { describe, expect, it } from 'vitest';
import {
  CUSTOMER_ORDER_NOTE_MAX_LENGTH,
  limitCustomerOrderNoteInput,
  normalizeCustomerOrderNote,
} from './customerOrderNote';

describe('customerOrderNote', () => {
  it('normalizes optional checkout notes before sending an order', () => {
    expect(normalizeCustomerOrderNote('  sem ketchup, interfone 12  ')).toBe('sem ketchup, interfone 12');
  });

  it('keeps empty notes out of the payload', () => {
    expect(normalizeCustomerOrderNote('   ')).toBe('');
  });

  it('limits typing and final payload to the accepted size', () => {
    const longNote = 'x'.repeat(CUSTOMER_ORDER_NOTE_MAX_LENGTH + 10);

    expect(limitCustomerOrderNoteInput(longNote)).toHaveLength(CUSTOMER_ORDER_NOTE_MAX_LENGTH);
    expect(normalizeCustomerOrderNote(longNote)).toHaveLength(CUSTOMER_ORDER_NOTE_MAX_LENGTH);
  });
});
