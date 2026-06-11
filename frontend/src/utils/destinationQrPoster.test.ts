import { describe, expect, it } from 'vitest';
import {
  buildHospitalityPlaceInstallUrl,
  buildHospitalityPlaceIosHubQrUrl,
  buildHospitalityPlacePlayStoreQrUrl,
  buildHospitalityPlacePosterFileName,
  buildHospitalityPlacePublicPath,
  buildHospitalityPlaceSmartQrUrl,
  JNC_IOS_HUB_URL,
  JNC_GOOGLE_PLAY_URL,
  escapePosterHtml,
  resolveHospitalityQrRedirectUrl,
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

  it('keeps Google Play as the Android redirect target', () => {
    expect(buildHospitalityPlacePlayStoreQrUrl()).toBe(JNC_GOOGLE_PLAY_URL);
    expect(buildHospitalityPlacePlayStoreQrUrl()).toContain('play.google.com/store/apps/details');
    expect(buildHospitalityPlacePlayStoreQrUrl()).toContain('id=com.janocaminho.app');
  });

  it('builds an iPhone QR target for the public hub', () => {
    expect(buildHospitalityPlaceIosHubQrUrl()).toBe(JNC_IOS_HUB_URL);
    expect(buildHospitalityPlaceIosHubQrUrl('https://janocaminho.com.br/')).toBe('https://janocaminho.com.br/hub');
  });

  it('builds a smart QR URL that can redirect by device', () => {
    const url = buildHospitalityPlaceSmartQrUrl(
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
    expect(parsed.searchParams.get('redirect')).toBe('auto');
    expect(parsed.searchParams.get('next')).toBe('/destinos/sao-bento-sapucai/chales/amere-chales');
  });

  it('resolves the QR redirect target for Android and iPhone', () => {
    expect(resolveHospitalityQrRedirectUrl('Mozilla/5.0 (Linux; Android 14; Pixel)')).toBe(JNC_GOOGLE_PLAY_URL);
    expect(resolveHospitalityQrRedirectUrl('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(
      JNC_IOS_HUB_URL
    );
    expect(resolveHospitalityQrRedirectUrl('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('');
  });

  it('escapes poster html and creates a safe file name', () => {
    expect(escapePosterHtml('<Amerê & Chalés>')).toBe('&lt;Amerê &amp; Chalés&gt;');
    expect(buildHospitalityPlacePosterFileName('Amerê Chalés!')).toBe('qr-app-amere-chales.html');
  });
});
