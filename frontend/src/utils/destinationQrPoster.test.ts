import { describe, expect, it } from 'vitest';
import {
  buildHospitalityPlaceInstallUrl,
  buildHospitalityPlacePosterFileName,
  buildHospitalityPlacePublicPath,
  escapePosterHtml,
} from './destinationQrPoster';

describe('destinationQrPoster', () => {
  it('builds a controlled install URL with destination and hospitality context', () => {
    const url = buildHospitalityPlaceInstallUrl(
      {
        destinationSlug: 'sao-bento-sapucai',
        destinationName: 'São Bento do Sapucaí',
        placeSlug: 'amere-chales',
        placeName: 'Amerê Chalés',
      },
      'https://janocaminho.com.br/'
    );

    const parsed = new URL(url);

    expect(parsed.origin).toBe('https://janocaminho.com.br');
    expect(parsed.pathname).toBe('/instalar');
    expect(parsed.searchParams.get('origem')).toBe('qr-chale');
    expect(parsed.searchParams.get('destino')).toBe('sao-bento-sapucai');
    expect(parsed.searchParams.get('chale')).toBe('amere-chales');
    expect(parsed.searchParams.get('nome')).toBe('Amerê Chalés');
    expect(parsed.searchParams.get('next')).toBe('/destinos/sao-bento-sapucai/chales/amere-chales');
  });

  it('returns a public hospitality path only when both slugs exist', () => {
    expect(buildHospitalityPlacePublicPath({ destinationSlug: 'destino', placeSlug: 'chale' })).toBe(
      '/destinos/destino/chales/chale'
    );
    expect(buildHospitalityPlacePublicPath({ destinationSlug: 'destino' })).toBe('');
  });

  it('escapes poster html and creates a safe file name', () => {
    expect(escapePosterHtml('<Amerê & Chalés>')).toBe('&lt;Amerê &amp; Chalés&gt;');
    expect(buildHospitalityPlacePosterFileName('Amerê Chalés!')).toBe('qr-app-amere-chales.html');
  });
});

