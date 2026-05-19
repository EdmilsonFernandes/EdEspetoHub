import { describe, expect, it } from 'vitest';
import {
  buildListingClaimUrl,
  buildListingInviteMessage,
  buildListingInviteWhatsAppUrl,
} from './destinationListingClaim';

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

  it('builds an absolute invite URL with selected hospitality places', () => {
    const url = buildListingClaimUrl(
      { id: 'dest-1', slug: 'goncalves', name: 'Gonçalves', city: 'Gonçalves', state: 'MG' },
      { id: 'listing-1', title: 'Restaurante Sauá', category: 'RESTAURANTE_VISITAR' },
      { baseUrl: 'https://janocaminho.com.br/', deliveryMode: 'selected', placeIds: ['place-1', 'place-2'] }
    );

    const parsed = new URL(url);

    expect(parsed.origin).toBe('https://janocaminho.com.br');
    expect(parsed.pathname).toBe('/create');
    expect(parsed.searchParams.get('deliveryMode')).toBe('selected');
    expect(parsed.searchParams.get('placeIds')).toBe('place-1,place-2');
  });

  it('builds a human WhatsApp invite message and contact URL', () => {
    const message = buildListingInviteMessage(
      { name: 'Gonçalves' },
      { title: 'Restaurante Sauá' },
      'https://janocaminho.com.br/create?source=destination_listing_claim'
    );
    const whatsappUrl = buildListingInviteWhatsAppUrl('(35) 99976-9970', message);

    expect(message).toContain('Restaurante Sauá');
    expect(message).toContain('Gonçalves');
    expect(message).toContain('REMOVER');
    expect(whatsappUrl.startsWith('https://wa.me/5535999769970?text=')).toBe(true);
  });
});
