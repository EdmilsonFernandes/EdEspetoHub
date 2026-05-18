import { describe, expect, it } from 'vitest';
import { isStaleBuildErrorMessage } from './staleBuildRecovery';

describe('staleBuildRecovery', () => {
  it('detects deployment-stale JavaScript chunk failures', () => {
    expect(isStaleBuildErrorMessage('Failed to fetch dynamically imported module')).toBe(true);
    expect(isStaleBuildErrorMessage('ChunkLoadError: Loading chunk 42 failed')).toBe(true);
    expect(isStaleBuildErrorMessage('/assets/MarketplacePage-abc.js net::ERR_ABORTED 404')).toBe(true);
  });

  it('ignores regular application errors', () => {
    expect(isStaleBuildErrorMessage('Erro inesperado. Tente novamente.')).toBe(false);
    expect(isStaleBuildErrorMessage('Network request failed for /api/orders')).toBe(false);
  });
});
