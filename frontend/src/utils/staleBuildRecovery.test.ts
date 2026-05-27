import { describe, expect, it } from 'vitest';
import { isStaleBuildErrorMessage, isVersionedAssetUrl } from './staleBuildRecovery';

describe('staleBuildRecovery', () => {
  it('detects deployment-stale JavaScript chunk failures', () => {
    expect(isStaleBuildErrorMessage('Failed to fetch dynamically imported module')).toBe(true);
    expect(isStaleBuildErrorMessage('ChunkLoadError: Loading chunk 42 failed')).toBe(true);
    expect(isStaleBuildErrorMessage('/assets/MarketplacePage-abc.js net::ERR_ABORTED 404')).toBe(true);
    expect(isStaleBuildErrorMessage("ReferenceError: Cannot access 'ct' before initialization")).toBe(true);
  });

  it('ignores regular application errors', () => {
    expect(isStaleBuildErrorMessage('Erro inesperado. Tente novamente.')).toBe(false);
    expect(isStaleBuildErrorMessage('Network request failed for /api/orders')).toBe(false);
  });

  it('detects versioned asset URLs reported by script/link error events', () => {
    expect(isVersionedAssetUrl('https://janocaminho.com.br/assets/index-gxeXBUCr.js')).toBe(true);
    expect(isVersionedAssetUrl('https://janocaminho.com.br/./LandingPage-2aqn3ICW.js')).toBe(true);
    expect(isVersionedAssetUrl('/assets/index-D3YXFGRe.css')).toBe(true);
  });

  it('does not treat regular API paths as versioned assets', () => {
    expect(isVersionedAssetUrl('/api/public/stores')).toBe(false);
    expect(isVersionedAssetUrl('/janocaminho.jpg')).toBe(false);
  });
});
