import { describe, expect, it } from 'vitest';
import {
  buildSiteCorreiosTrackingUrl,
  getPostalEventSourceCopy,
  getPostalStatusCopy,
  getPostalTrackingExternalUrl,
  getPostalTrackingHeadline,
  getPostalTrackingUnavailableCopy,
  sortPostalEventsDesc,
} from './postalTracking';

describe('postalTracking utils', () => {
  it('returns friendly copy for known postal statuses', () => {
    expect(getPostalStatusCopy('posted').label).toBe('Pedido postado');
    expect(getPostalStatusCopy('out_for_delivery').description).toMatch(/saiu para entrega/i);
  });

  it('builds no-code headline for postal orders without tracking yet', () => {
    const headline = getPostalTrackingHeadline({ trackingCode: null, shipmentStatus: 'pending_posting' });
    expect(headline.label).toBe('Aguardando código');
    expect(headline.description).toMatch(/informar o código/i);
  });

  it('sorts events by event date descending', () => {
    const events = sortPostalEventsDesc([
      { status: 'posted', eventAt: '2026-01-01T10:00:00.000Z' },
      { status: 'delivered', eventAt: '2026-01-02T10:00:00.000Z' },
    ]);
    expect(events[0].status).toBe('delivered');
  });

  it('translates technical event sources to customer-friendly copy', () => {
    expect(getPostalEventSourceCopy('seller')).toMatchObject({
      label: 'Loja',
      description: 'Atualizado pela loja.',
    });
    expect(getPostalEventSourceCopy('system')).toMatchObject({
      label: 'Já no Caminho',
    });
    expect(getPostalEventSourceCopy('carrier')).toMatchObject({
      label: 'Correios',
    });
  });

  it('builds no-captcha SiteCorreios URL for valid Correios tracking codes', () => {
    expect(buildSiteCorreiosTrackingUrl(' ok819652779br ')).toBe('https://www.sitecorreios.com.br/OK819652779BR');
    expect(getPostalTrackingExternalUrl('OK819652779BR', 'https://rastreamento.correios.com.br/app/index.php?objetos=OK819652779BR'))
      .toBe('https://www.sitecorreios.com.br/OK819652779BR');
  });

  it('keeps custom external URL for non-Correios tracking codes', () => {
    expect(getPostalTrackingExternalUrl('TRACK-123456', 'https://transportadora.example/r/TRACK-123456'))
      .toBe('https://transportadora.example/r/TRACK-123456');
  });

  it('explains provider empty response without suggesting invalid tracking code', () => {
    expect(getPostalTrackingUnavailableCopy('Período inválido').label).toBe('Rastreio externo disponível');
  });
});
