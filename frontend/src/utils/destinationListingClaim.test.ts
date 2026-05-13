import { describe, expect, it } from 'vitest';
import { buildListingClaimUrl } from './destinationListingClaim';

describe('destinationListingClaim', () => {
  it('builds a store claim URL with destination and listing context', () => {
    const url = buildListingClaimUrl(
      {
        id: 'dest-1',
        slug: 'sao-bento-sapucai',
        name: 'Sao Bento do Sapucai',
        city: 'Sao Bento do Sapucai',
        state: 'SP',
      },
      {
        id: 'listing-1',
        title: 'Bar do Tiao',
        description: 'Comida caseira perto dos chales.',
        address: 'Centro',
        whatsapp: '(12) 99700-0000',
        category: 'RESTAURANTE_VISITAR',
      }
    );

    const params = new URLSearchParams(url.split('?')[1]);

    expect(url.startsWith('/create?')).toBe(true);
    expect(params.get('source')).toBe('destination_listing_claim');
    expect(params.get('destinationId')).toBe('dest-1');
    expect(params.get('destinationSlug')).toBe('sao-bento-sapucai');
    expect(params.get('storeName')).toBe('Bar do Tiao');
    expect(params.get('phone')).toBe('(12) 99700-0000');
    expect(params.get('segment')).toBe('restaurante');
  });
});
