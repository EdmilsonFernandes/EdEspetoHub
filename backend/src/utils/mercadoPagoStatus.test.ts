import { describe, expect, it } from 'vitest';
import {
  isMercadoPagoApprovedStatus,
  isMercadoPagoFailedStatus,
  isMercadoPagoPendingStatus,
  normalizeMercadoPagoStatus,
} from './mercadoPagoStatus';

describe('mercadoPagoStatus', () => {
  it('normalizes provider status safely', () => {
    expect(normalizeMercadoPagoStatus(' Approved ')).toBe('approved');
    expect(normalizeMercadoPagoStatus(null)).toBe('');
  });

  it('treats approved as paid', () => {
    expect(isMercadoPagoApprovedStatus('approved')).toBe(true);
    expect(isMercadoPagoApprovedStatus('pending')).toBe(false);
  });

  it('does not treat pending Pix statuses as failures', () => {
    expect(isMercadoPagoFailedStatus('pending')).toBe(false);
    expect(isMercadoPagoFailedStatus('in_process')).toBe(false);
    expect(isMercadoPagoFailedStatus('authorized')).toBe(false);
  });

  it('treats non-terminal Mercado Pago statuses as pending local state', () => {
    expect(isMercadoPagoPendingStatus('pending')).toBe(true);
    expect(isMercadoPagoPendingStatus('in_process')).toBe(true);
    expect(isMercadoPagoPendingStatus('authorized')).toBe(true);
    expect(isMercadoPagoPendingStatus('approved')).toBe(false);
    expect(isMercadoPagoPendingStatus('rejected')).toBe(false);
    expect(isMercadoPagoPendingStatus('')).toBe(false);
  });

  it('treats only terminal failure statuses as failures', () => {
    expect(isMercadoPagoFailedStatus('rejected')).toBe(true);
    expect(isMercadoPagoFailedStatus('cancelled')).toBe(true);
    expect(isMercadoPagoFailedStatus('charged_back')).toBe(true);
    expect(isMercadoPagoFailedStatus('refunded')).toBe(true);
    expect(isMercadoPagoFailedStatus('failed')).toBe(true);
  });
});
