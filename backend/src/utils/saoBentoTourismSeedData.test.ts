import { describe, expect, it } from 'vitest';
import {
  SAO_BENTO_HOSPITALITY_SEEDS,
  SAO_BENTO_LISTING_SEEDS,
} from './saoBentoTourismSeedData';

const phoneDigits = (value?: string) => String(value || '').replace(/\D/g, '');

const localPhoneDigits = (value?: string) => {
  const digits = phoneDigits(value);
  return digits.startsWith('55') ? digits.slice(2) : digits;
};

describe('saoBentoTourismSeedData', () => {
  it('keeps hospitality slugs unique and ready for idempotent upsert', () => {
    const slugs = SAO_BENTO_HOSPITALITY_SEEDS.map((seed) => seed.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs.every((slug) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))).toBe(true);
  });

  it('keeps listing titles unique so the seed can safely refresh its own records', () => {
    const titles = SAO_BENTO_LISTING_SEEDS.map((seed) => seed.title);

    expect(new Set(titles).size).toBe(titles.length);
  });

  it('only marks mobile numbers as whatsapp contacts', () => {
    const whatsappNumbers = [
      ...SAO_BENTO_HOSPITALITY_SEEDS.map((seed) => seed.whatsapp),
      ...SAO_BENTO_LISTING_SEEDS.map((seed) => seed.whatsapp),
    ].filter(Boolean);

    expect(whatsappNumbers.length).toBeGreaterThan(20);
    expect(whatsappNumbers.every((phone) => /^\d{2}9\d{8}$/.test(localPhoneDigits(phone)))).toBe(true);
  });

  it('covers lodging plus the main visitor categories for the public destination page', () => {
    const categories = new Set(SAO_BENTO_LISTING_SEEDS.map((seed) => seed.category));

    expect(SAO_BENTO_HOSPITALITY_SEEDS.length).toBeGreaterThanOrEqual(20);
    expect(categories.has('ATRATIVO')).toBe(true);
    expect(categories.has('PASSEIO')).toBe(true);
    expect(categories.has('RESTAURANTE_VISITAR')).toBe(true);
    expect(categories.has('NOITE')).toBe(true);
    expect(categories.has('SERVICO')).toBe(true);
  });
});
