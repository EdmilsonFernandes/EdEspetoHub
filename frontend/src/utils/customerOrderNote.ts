export const CUSTOMER_ORDER_NOTE_MAX_LENGTH = 240;

export const normalizeCustomerOrderNote = (value: unknown, maxLength = CUSTOMER_ORDER_NOTE_MAX_LENGTH) => {
  const text = String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!text) return '';
  return text.slice(0, maxLength);
};

export const limitCustomerOrderNoteInput = (value: unknown, maxLength = CUSTOMER_ORDER_NOTE_MAX_LENGTH) =>
  String(value ?? '').slice(0, maxLength);
