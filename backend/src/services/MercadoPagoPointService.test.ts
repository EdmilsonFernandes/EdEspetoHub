import { describe, it, expect } from 'vitest';
import { normalizeTerminalList, terminalSerial } from './MercadoPagoPointService';

/**
 * Terminais Point (Orders API) — GET /terminals/v1/list.
 *
 * Formato oficial da resposta (doc MP, ago/2026):
 * { data: { terminals: [{ id: "NEWLAND_N950__N950NCB801293324", pos_id,
 *   store_id, external_pos_id, operating_mode }] }, paging }
 *
 * Garantias destes testes:
 * - serial físico extraído do id (`MODELO__SERIAL`) para o lojista conferir
 *   com a etiqueta traseira da maquininha;
 * - integrationReady SOMENTE em modo PDV (STANDALONE/UNDEFINED não integram);
 * - resposta malformada/ausente nunca explode o endpoint.
 */
describe('terminalSerial', () => {
  it('extrai o serial depois do separador __', () => {
    expect(terminalSerial('NEWLAND_N950__N950NCB801293324')).toBe('N950NCB801293324');
  });

  it('devolve null quando não há separador ou id vazia', () => {
    expect(terminalSerial('NEWLAND_N950')).toBeNull();
    expect(terminalSerial('')).toBeNull();
  });
});

describe('normalizeTerminalList', () => {
  it('normaliza um terminal completo em modo PDV', () => {
    const result = normalizeTerminalList({
      data: {
        terminals: [
          {
            id: 'NEWLAND_N950__N950NCB801293324',
            pos_id: '23545678',
            store_id: '12354567',
            external_pos_id: 'SUC0101POS',
            operating_mode: 'PDV',
          },
        ],
      },
      paging: { total: 1, offset: 0, limit: 50 },
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'NEWLAND_N950__N950NCB801293324',
      serialNumber: 'N950NCB801293324',
      posId: '23545678',
      mpStoreId: '12354567',
      externalPosId: 'SUC0101POS',
      operatingMode: 'PDV',
      integrationReady: true,
    });
  });

  it('terminal em STANDALONE/UNDEFINED não está pronto para integração', () => {
    const result = normalizeTerminalList({
      data: {
        terminals: [
          { id: 'PAX_910__PAX123', operating_mode: 'STANDALONE' },
          { id: 'NEWLAND_N950__N950XYZ', operating_mode: 'UNDEFINED' },
          { id: 'NEWLAND_N950__N950ABC' }, // sem operating_mode
        ],
      },
    });

    expect(result.map((t) => t.integrationReady)).toEqual([false, false, false]);
    expect(result[2].operatingMode).toBe('UNDEFINED');
  });

  it('tolera modo em minúsculas (defesa contra variação do MP)', () => {
    const result = normalizeTerminalList({
      data: { terminals: [{ id: 'NEWLAND_N950__N950DEF', operating_mode: 'pdv' }] },
    });
    expect(result[0].integrationReady).toBe(true);
  });

  it('resposta vazia, sem data ou malformada devolve lista vazia', () => {
    expect(normalizeTerminalList({ data: { terminals: [] } })).toEqual([]);
    expect(normalizeTerminalList({})).toEqual([]);
    expect(normalizeTerminalList(null)).toEqual([]);
    // terminal sem id é descartado em vez de quebrar a listagem inteira
    expect(
      normalizeTerminalList({ data: { terminals: [{ operating_mode: 'PDV' }, { id: 'A__1' }] } })
    ).toHaveLength(1);
  });

  it('mantém null em campos opcionais ausentes', () => {
    const result = normalizeTerminalList({
      data: { terminals: [{ id: 'A__1', operating_mode: 'PDV' }] },
    });
    expect(result[0].posId).toBeNull();
    expect(result[0].mpStoreId).toBeNull();
    expect(result[0].externalPosId).toBeNull();
    expect(result[0].serialNumber).toBe('1');
  });
});
