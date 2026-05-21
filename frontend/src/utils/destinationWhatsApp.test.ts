import { describe, expect, it } from 'vitest';
import {
  buildPhoneCallUrl,
  buildDestinationInquiryMessage,
  buildHospitalityServiceRouteUrl,
  buildWhatsAppUrl,
  normalizeBrazilianContactPhone,
  normalizeWhatsAppPhone,
  prettifyDestinationLabel,
} from './destinationWhatsApp';

describe('destinationWhatsApp', () => {
  it('normalizes Brazilian phone numbers for WhatsApp', () => {
    expect(normalizeWhatsAppPhone('(12) 99700-0000')).toBe('5512997000000');
    expect(normalizeWhatsAppPhone('+55 12 99700-0000')).toBe('5512997000000');
    expect(normalizeWhatsAppPhone('(12) 3300-0000')).toBe('');
    expect(normalizeWhatsAppPhone('')).toBe('');
  });

  it('keeps a phone fallback for non-mobile contact numbers', () => {
    expect(normalizeBrazilianContactPhone('(12) 3300-0000')).toBe('551233000000');
    expect(buildPhoneCallUrl('(12) 3300-0000')).toBe('tel:+551233000000');
    expect(buildWhatsAppUrl('(12) 3300-0000', 'Oi')).toBe('');
  });

  it('builds WhatsApp URLs with an encoded contextual message', () => {
    const url = buildWhatsAppUrl('12997000000', 'Ola! Quero saber mais.');

    expect(url).toBe('https://wa.me/5512997000000?text=Ola!%20Quero%20saber%20mais.');
  });

  it('builds native WhatsApp URLs when requested', () => {
    const url = buildWhatsAppUrl('12997000000', 'Pedido pelo app', true);

    expect(url).toBe('whatsapp://send?phone=5512997000000&text=Pedido%20pelo%20app');
  });

  it('creates a message with destination, place and selected service context', () => {
    const message = buildDestinationInquiryMessage({
      destinationName: 'Sao Bento Sapucai',
      city: 'Sao Bento Sapucai',
      state: 'SP',
      itemName: 'Massagem relaxante',
      itemType: 'massagem',
      placeName: 'Chale Vista da Pedra',
      placeAddress: 'Estrada do Bau, km 7',
      placeLat: -22.6901,
      placeLng: -45.7321,
      itemAddress: 'Rua do Centro, 10',
      itemLat: -22.6888,
      itemLng: -45.7299,
      destinationSlug: 'sao-bento-sapucai',
      placeSlug: 'chale-vista-da-pedra',
    });

    expect(message).toContain('Encontrei Massagem relaxante pelo J\u00e1 no Caminho');
    expect(message).toContain('Estou em Sao Bento Sapucai - SP e hospedado(a) em Chale Vista da Pedra.');
    expect(message).toContain('Referencia para entrega/atendimento:');
    expect(message).toContain('Hospedagem: Chale Vista da Pedra');
    expect(message).toContain('Endereco da hospedagem: Estrada do Bau, km 7');
    expect(message).toContain('Mapa da hospedagem: https://www.google.com/maps/search/?api=1&query=-22.6901%2C-45.7321');
    expect(message).not.toContain('Local do atendimento: Rua do Centro, 10');
    expect(message).toContain('Link com rota/referencia para entrega: https://janocaminho.com.br/destinos/sao-bento-sapucai/chales/chale-vista-da-pedra/rota?');
    expect(message).toContain('serviceName=Massagem+relaxante');
    expect(message).toContain('placeAddress=Estrada+do+Bau%2C+km+7');
    expect(message).toContain('Gostaria de saber mais sobre massagem');
  });

  it('builds a public service-to-hospitality route URL', () => {
    const url = buildHospitalityServiceRouteUrl({
      destinationSlug: 'monte-verde',
      placeSlug: 'chale-da-serra',
      serviceName: 'Restaurante da vila',
      serviceAddress: 'Av. Monte Verde, 100',
      placeName: 'Chale da Serra',
      placeAddress: 'Estrada dos Pinheiros, 80',
    });

    expect(url).toContain('https://janocaminho.com.br/destinos/monte-verde/chales/chale-da-serra/rota?');
    expect(url).toContain('serviceName=Restaurante+da+vila');
    expect(url).toContain('serviceAddress=Av.+Monte+Verde%2C+100');
    expect(url).toContain('placeAddress=Estrada+dos+Pinheiros%2C+80');
  });

  it('builds a hospitality route URL even when the service has no address', () => {
    const url = buildHospitalityServiceRouteUrl({
      destinationSlug: 'monte-verde',
      placeSlug: 'chale-da-serra',
      serviceName: 'Delivery local',
      placeName: 'Chale da Serra',
      placeAddress: 'Estrada dos Pinheiros, 80',
    });

    expect(url).toContain('https://janocaminho.com.br/destinos/monte-verde/chales/chale-da-serra/rota?');
    expect(url).toContain('serviceName=Delivery+local');
    expect(url).toContain('placeAddress=Estrada+dos+Pinheiros%2C+80');
  });

  it('adds an item address and map when no hospitality place is present', () => {
    const message = buildDestinationInquiryMessage({
      destinationName: 'Monte Verde',
      state: 'MG',
      itemName: 'Passeio de quadriciclo',
      itemType: 'serviço',
      itemAddress: 'Av. Monte Verde, 100',
    });

    expect(message).toContain('Local do atendimento: Av. Monte Verde, 100');
    expect(message).toContain('Mapa do atendimento: https://www.google.com/maps/search/?api=1&query=Av.%20Monte%20Verde%2C%20100');
  });

  it('prettifies slugs used as fallback labels', () => {
    expect(prettifyDestinationLabel('sao-bento_sapucai')).toBe('Sao Bento Sapucai');
  });
});
