import { describe, expect, it } from 'vitest';
import {
  formatDestinationClaimPlaceAddress,
  getDestinationClaimPlaceImage,
  resolveDestinationClaimPlaces,
} from './destinationClaimPlaces';

describe('destinationClaimPlaces', () => {
  it('reads hospitalityPlaces from the public destination payload', () => {
    const places = resolveDestinationClaimPlaces({
      hospitalityPlaces: [
        { id: 'place-1', name: 'Chale Encanto' },
        { id: '', name: 'Invalid place' },
        { id: 'place-2', name: '' },
      ],
      places: [{ id: 'legacy', name: 'Legacy place' }],
    });

    expect(places).toEqual([{ id: 'place-1', name: 'Chale Encanto' }]);
  });

  it('keeps compatibility with legacy places payloads', () => {
    expect(resolveDestinationClaimPlaces({ places: [{ id: 'place-1', name: 'Pousada Vista' }] })).toEqual([
      { id: 'place-1', name: 'Pousada Vista' },
    ]);
  });

  it('picks the best available hospitality image', () => {
    expect(getDestinationClaimPlaceImage({ bannerUrls: ['/banner-2.jpg'], logoUrl: '/logo.jpg' })).toBe('/banner-2.jpg');
    expect(getDestinationClaimPlaceImage({ bannerUrl: '/banner.jpg', bannerUrls: ['/banner-2.jpg'] })).toBe('/banner.jpg');
  });

  it('formats address parts without empty separators', () => {
    expect(
      formatDestinationClaimPlaceAddress({
        address: 'Estrada da Serra',
        addressNumber: '100',
        city: 'São Bento do Sapucaí',
        state: 'SP',
      }),
    ).toBe('Estrada da Serra • 100 • São Bento do Sapucaí • SP');
  });
});
