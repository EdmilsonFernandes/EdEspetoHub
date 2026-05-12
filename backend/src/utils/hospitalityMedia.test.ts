import { describe, expect, it } from 'vitest';
import {
  MAX_HOSPITALITY_BANNER_IMAGES,
  mergeHospitalityBannerSlots,
  normalizeHospitalityBannerSlots,
  normalizeHospitalityBannerUrls,
} from './hospitalityMedia';

describe('hospitalityMedia', () => {
  it('normalizes, deduplicates and limits public banner urls', () => {
    expect(
      normalizeHospitalityBannerUrls(
        ' /uploads/a.jpg ',
        ['', null, '/uploads/b.jpg', '/uploads/a.jpg'],
        ['/uploads/c.jpg', '/uploads/d.jpg', '/uploads/e.jpg']
      )
    ).toEqual(['/uploads/a.jpg', '/uploads/b.jpg', '/uploads/c.jpg', '/uploads/d.jpg']);
  });

  it('keeps editable banner slots bounded to the gallery limit', () => {
    expect(normalizeHospitalityBannerSlots(['a', null, ' c ', 'd', 'e', 'f'])).toEqual(['a', '', 'c', 'd']);
    expect(normalizeHospitalityBannerSlots('a')).toEqual([]);
    expect(MAX_HOSPITALITY_BANNER_IMAGES).toBe(4);
  });

  it('merges uploaded files and existing urls while preserving carousel slot order', () => {
    expect(
      mergeHospitalityBannerSlots(
        ['/url-1.jpg', '/url-2.jpg', '', '/url-4.jpg'],
        ['', '/upload-2.jpg', '/upload-3.jpg', '']
      )
    ).toEqual(['/url-1.jpg', '/upload-2.jpg', '/upload-3.jpg', '/url-4.jpg']);
  });
});
