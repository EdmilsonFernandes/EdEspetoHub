import { afterEach, describe, expect, it, vi } from 'vitest';
import { BRAZIL_STATES, loadBrazilCitiesByState, normalizeLocationName } from './brazilLocations';

describe('brazilLocations', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('provides all Brazilian state options', () => {
    expect(BRAZIL_STATES).toHaveLength(27);
    expect(BRAZIL_STATES.find((state) => state.value === 'SP')?.label).toBe('São Paulo');
    expect(BRAZIL_STATES.find((state) => state.value === 'MG')?.label).toBe('Minas Gerais');
  });

  it('normalizes city names for duplicate checks', () => {
    expect(normalizeLocationName('São Bento do Sapucaí')).toBe('sao bento do sapucai');
    expect(normalizeLocationName(' Sao   Francisco-Xavier ')).toBe('sao francisco xavier');
  });

  it('merges IBGE cities and districts for destination registration', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ nome: 'São José dos Campos' }, { nome: 'Jacareí' }],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ nome: 'São Francisco Xavier' }, { nome: 'São José dos Campos' }],
      });

    vi.stubGlobal('fetch', fetchMock);

    const locations = await loadBrazilCitiesByState('SP');

    expect(locations).toContain('São José dos Campos');
    expect(locations).toContain('São Francisco Xavier');
    expect(locations.filter((location) => location === 'São José dos Campos')).toHaveLength(1);
  });
});
