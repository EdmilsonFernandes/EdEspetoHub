import { describe, expect, it } from 'vitest';
import {
  buildCorreiosTrackingUrl,
  isCorreiosTrackingCode,
  isValidTrackingCode,
  normalizeTrackingCode,
} from './trackingCode';

describe('trackingCode', () => {
  it('normaliza código removendo espaços e caixa baixa', () => {
    expect(normalizeTrackingCode(' aa 123456789 br ')).toBe('AA123456789BR');
  });

  it('valida formato clássico dos Correios', () => {
    expect(isCorreiosTrackingCode('AA123456789BR')).toBe(true);
    expect(isValidTrackingCode('AA123456789BR')).toBe(true);
  });

  it('rejeita código incompleto', () => {
    expect(isValidTrackingCode('ABC')).toBe(false);
  });

  it('monta URL oficial de rastreio', () => {
    expect(buildCorreiosTrackingUrl('AA123456789BR')).toContain('AA123456789BR');
  });
});
