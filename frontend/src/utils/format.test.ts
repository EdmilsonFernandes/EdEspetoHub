import { describe, expect, it } from 'vitest';
import { formatAddressLines } from './format';

describe('formatAddressLines', () => {
  it('separates pipe-delimited checkout addresses into user-friendly lines', () => {
    const result = formatAddressLines('Rua das Flores, 123 | Bloco A | Centro | São Bento do Sapucaí - SP | CEP 12490-000');

    expect(result).toEqual({
      primary: 'Rua das Flores, 123',
      secondary: 'Bloco A · Centro',
      locality: 'São Bento do Sapucaí - SP',
      zipCode: 'CEP 12490-000',
    });
  });

  it('keeps plain addresses readable without technical separators', () => {
    const result = formatAddressLines('Avenida Central, 400 - Centro');

    expect(result.primary).toBe('Avenida Central, 400 - Centro');
    expect(result.secondary).toBe('');
  });
});
