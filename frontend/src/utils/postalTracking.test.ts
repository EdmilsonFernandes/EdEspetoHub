import { describe, expect, it } from 'vitest';
import {
  addPostalBusinessDays,
  buildSiteCorreiosTrackingUrl,
  getPostalExpectedDeliveryDeadlineMs,
  getPostalEventSourceCopy,
  getPostalEstimatedDays,
  getPostalStatusCopy,
  getPostalTrackingExternalUrl,
  getPostalTrackingHeadline,
  getPostalTrackingUnavailableCopy,
  isPostalShipmentDelayed,
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

  it('calculates postal ETA using business days', () => {
    const start = new Date('2026-06-05T12:00:00.000Z'); // Friday
    expect(addPostalBusinessDays(start, 2).toISOString().slice(0, 10)).toBe('2026-06-09');
  });

  it('does not mark future postal delivery as delayed', () => {
    const order = { createdAt: '2026-06-05T12:00:00.000Z' };
    const shipment = { postedAt: '2026-06-05T12:00:00.000Z', estimatedDays: 4, shipmentStatus: 'in_transit' };
    const deadlineMs = getPostalExpectedDeliveryDeadlineMs(order, shipment);

    expect(deadlineMs).toBeTruthy();
    expect(new Date(deadlineMs as number).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })).toBe('11/06/2026');
    expect(isPostalShipmentDelayed(order, shipment, new Date('2026-06-07T12:00:00.000Z').getTime())).toBe(false);
  });

  it('does not mark delivered postal orders as delayed', () => {
    const order = { createdAt: '2026-06-01T12:00:00.000Z' };
    const shipment = { postedAt: '2026-06-01T12:00:00.000Z', estimatedDays: 1, deliveredAt: '2026-06-03T12:00:00.000Z' };

    expect(isPostalShipmentDelayed(order, shipment, new Date('2026-06-10T12:00:00.000Z').getTime())).toBe(false);
  });

  it('uses postal service fallback days when quote has no explicit ETA', () => {
    expect(getPostalEstimatedDays({ serviceCode: 'PAC' })).toBe(8);
    expect(getPostalEstimatedDays({ serviceName: 'SEDEX Hoje' })).toBe(4);
  });
});
