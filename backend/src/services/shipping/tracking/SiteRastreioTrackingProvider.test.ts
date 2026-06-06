import { afterEach, describe, expect, it, vi } from 'vitest';
import { env } from '../../../config/env';
import {
  mapSiteRastreioPayloadToEvents,
  SiteRastreioTrackingProvider,
} from './SiteRastreioTrackingProvider';

describe('SiteRastreioTrackingProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps carrier events from nested Site Rastreio/Wonca payloads', () => {
    const events = mapSiteRastreioPayloadToEvents({
      data: {
        events: [
          {
            status: 'Objeto saiu para entrega ao destinatário',
            date: '06/06/2026',
            time: '13:45',
            location: 'São José dos Campos / SP',
          },
          {
            status: 'Objeto postado',
            date: '05/06/2026',
            time: '09:10',
            location: 'São Bento do Sapucaí / SP',
          },
        ],
      },
    });

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      source: 'carrier',
      status: 'out_for_delivery',
      title: 'Objeto saiu para entrega ao destinatário',
      location: 'São José dos Campos / SP',
    });
    expect(events[1]).toMatchObject({
      status: 'posted',
      title: 'Objeto postado',
    });
  });

  it('maps Correios events embedded as a json string by Site Rastreio/Wonca', () => {
    const events = mapSiteRastreioPayloadToEvents({
      carrier: 'CARRIER_CORREIOS',
      json: JSON.stringify({
        codObjeto: 'AA000000000BR',
        eventos: [
          {
            codigo: 'CO',
            tipo: '01',
            descricao: 'Objeto coletado',
            descricaoFrontEnd: 'Objeto coletado',
            dtHrCriado: {
              date: '2026-03-05 15:10:00.000000',
              timezone_type: 3,
              timezone: 'America/Sao_Paulo',
            },
            unidade: {
              tipo: 'Unidade de Distribuição',
              endereco: {
                cidade: 'SAO PAULO',
                uf: 'SP',
              },
            },
          },
        ],
      }),
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      source: 'carrier',
      status: 'posted',
      title: 'Objeto coletado',
      location: 'SAO PAULO / SP',
    });
  });

  it('returns provider unavailable instead of throwing when account has no credits', async () => {
    env.shipping.siteRastreioApiKey = 'test-key';
    env.shipping.siteRastreioBaseUrl = 'https://example.test';

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ code: 'failed_precondition', message: 'insufficient credit balance' }),
      }))
    );

    const result = await new SiteRastreioTrackingProvider().fetchTracking({
      orderId: 'order-1',
      trackingCode: 'AA361812099BR',
    });

    expect(result.provider).toBe('siterastreio');
    expect(result.events).toEqual([]);
    expect(result.unavailableReason).toBe('insufficient credit balance');
  });

  it('fetches and maps tracking events when provider responds successfully', async () => {
    env.shipping.siteRastreioApiKey = 'test-key';
    env.shipping.siteRastreioBaseUrl = 'https://example.test';

    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        result: {
          tracking: {
            events: [
              {
                descricao: 'Objeto entregue ao destinatário',
                data: '06/06/2026',
                hora: '16:02',
                local: 'Gonçalves / MG',
              },
            ],
          },
        },
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await new SiteRastreioTrackingProvider().fetchTracking({
      orderId: 'order-1',
      trackingCode: ' aa361812099br ',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/Track',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ code: 'AA361812099BR' }),
      })
    );
    expect(result.events[0]).toMatchObject({
      status: 'delivered',
      title: 'Objeto entregue ao destinatário',
      location: 'Gonçalves / MG',
    });
  });

  it('fetches and maps tracking events from provider json string responses', async () => {
    env.shipping.siteRastreioApiKey = 'test-key';
    env.shipping.siteRastreioBaseUrl = 'https://example.test';

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          json: JSON.stringify({
            eventos: [
              {
                descricao: 'Objeto entregue ao destinatário',
                dtHrCriado: { date: '2026-06-06 16:02:00.000000' },
                unidade: { endereco: { cidade: 'GONCALVES', uf: 'MG' } },
              },
            ],
          }),
          carrier: 'CARRIER_CORREIOS',
        }),
      }))
    );

    const result = await new SiteRastreioTrackingProvider().fetchTracking({
      orderId: 'order-1',
      trackingCode: 'AA361812099BR',
    });

    expect(result.unavailableReason).toBeNull();
    expect(result.events[0]).toMatchObject({
      status: 'delivered',
      title: 'Objeto entregue ao destinatário',
      location: 'GONCALVES / MG',
    });
  });

  it('returns provider message when Site Rastreio responds with an embedded error', async () => {
    env.shipping.siteRastreioApiKey = 'test-key';
    env.shipping.siteRastreioBaseUrl = 'https://example.test';

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          json: JSON.stringify({ erro: true, mensagem: 'Período inválido' }),
          carrier: 'CARRIER_CORREIOS',
        }),
      }))
    );

    const result = await new SiteRastreioTrackingProvider().fetchTracking({
      orderId: 'order-1',
      trackingCode: 'AA361812099BR',
    });

    expect(result.events).toEqual([]);
    expect(result.status).toBe('tracking_unavailable');
    expect(result.unavailableReason).toBe('Período inválido');
  });
});
