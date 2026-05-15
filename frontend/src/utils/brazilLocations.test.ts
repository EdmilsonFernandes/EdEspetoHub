import { describe, expect, it } from 'vitest';
import { BRAZIL_STATES, normalizeLocationName } from './brazilLocations';

describe('brazilLocations', () => {
  it('provides all Brazilian state options', () => {
    expect(BRAZIL_STATES).toHaveLength(27);
    expect(BRAZIL_STATES.find((state) => state.value === 'SP')?.label).toBe('São Paulo');
    expect(BRAZIL_STATES.find((state) => state.value === 'MG')?.label).toBe('Minas Gerais');
  });

  it('normalizes city names for duplicate checks', () => {
    expect(normalizeLocationName('São Bento do Sapucaí')).toBe('sao bento do sapucai');
    expect(normalizeLocationName(' Sao   Francisco-Xavier ')).toBe('sao francisco xavier');
  });
});
