import { describe, expect, it } from 'vitest';
import {
  MAX_HOME_BANNERS,
  getFallbackHomeConfig,
  normalizeHomeConfig,
  resolveHomeConfig,
} from './homeConfig';

describe('homeConfig', () => {
  it('returns the fallback config when no stored value exists', () => {
    const resolved = resolveHomeConfig();
    expect(resolved.usesFallback).toBe(true);
    expect(resolved.homeBanners).toHaveLength(4);
    expect(resolved.marketingPopup.active).toBe(true);
  });

  it('normalizes and sorts banners when payload is valid', () => {
    const normalized = normalizeHomeConfig({
      homeBanners: [
        {
          id: 'banner-b',
          imageUrl: '/uploads/logos/banner-b.webp',
          title: 'Banner B',
          actionLabel: 'Saiba mais',
          order: 2,
          active: true,
        },
        {
          id: 'banner-a',
          imageUrl: '/uploads/logos/banner-a.webp',
          title: 'Banner A',
          order: 1,
          active: false,
          fit: 'contain',
        },
      ],
      marketingPopup: {
        imageUrl: '/uploads/logos/popup.webp',
        actionLabel: 'Baixar app',
        active: true,
      },
    });

    expect(normalized.homeBanners.map((banner) => banner.id)).toEqual(['banner-a', 'banner-b']);
    expect(normalized.homeBanners.map((banner) => banner.order)).toEqual([1, 2]);
    expect(normalized.homeBanners[0].fit).toBe('contain');
    expect(normalized.homeBanners[1].actionLabel).toBe('Saiba mais');
    expect(normalized.marketingPopup.imageUrl).toBe('/uploads/logos/popup.webp');
    expect(normalized.marketingPopup.actionLabel).toBe('Baixar app');
  });

  it('rejects more than four banners', () => {
    const payload = {
      homeBanners: Array.from({ length: MAX_HOME_BANNERS + 1 }, (_, index) => ({
        id: `banner-${index + 1}`,
        imageUrl: `/uploads/logos/banner-${index + 1}.webp`,
        order: index + 1,
        active: true,
      })),
      marketingPopup: {
        imageUrl: '/uploads/logos/popup.webp',
        active: true,
      },
    };

    expect(() => normalizeHomeConfig(payload)).toThrow('home_banners_limit_exceeded');
  });

  it('falls back when stored JSON is malformed', () => {
    const resolved = resolveHomeConfig('{bad-json');
    expect(resolved.usesFallback).toBe(true);
    expect(resolved.homeBanners).toEqual(getFallbackHomeConfig().homeBanners);
  });
});
