import { describe, expect, it } from 'vitest';
import { DEFAULT_HOME_CONFIG, normalizeHomeConfigPayload } from './homeConfigService';

describe('homeConfigService', () => {
  it('falls back to the default shape when payload is empty', () => {
    const normalized = normalizeHomeConfigPayload({});
    expect(normalized.homeBanners).toEqual([]);
    expect(normalized.marketingPopup.imageUrl).toBe('');
  });

  it('sorts and limits banners for the public home preview', () => {
    const normalized = normalizeHomeConfigPayload({
      homeBanners: [
        { id: 'banner-4', imageUrl: '/img-4.jpg', order: 4, active: true, actionLabel: 'Saiba mais' },
        { id: 'banner-2', imageUrl: '/img-2.jpg', order: 2, active: true },
        { id: 'banner-1', imageUrl: '/img-1.jpg', order: 1, active: true },
        { id: 'banner-3', imageUrl: '/img-3.jpg', order: 3, active: true },
        { id: 'banner-5', imageUrl: '/img-5.jpg', order: 5, active: true },
      ],
      marketingPopup: DEFAULT_HOME_CONFIG.marketingPopup,
    });

    expect(normalized.homeBanners).toHaveLength(4);
    expect(normalized.homeBanners.map((banner) => banner.id)).toEqual([
      'banner-1',
      'banner-2',
      'banner-3',
      'banner-4',
    ]);
    expect(normalized.homeBanners[3].actionLabel).toBe('Saiba mais');
  });
});
