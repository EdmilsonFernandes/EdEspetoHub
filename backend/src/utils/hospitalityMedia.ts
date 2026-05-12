export const MAX_HOSPITALITY_BANNER_IMAGES = 4;

export const normalizeHospitalityBannerUrls = (...sources: unknown[]): string[] => {
  const values: string[] = [];

  const addValue = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(addValue);
      return;
    }
    const text = String(value ?? '').trim();
    if (!text || values.includes(text)) return;
    values.push(text);
  };

  sources.forEach(addValue);
  return values.slice(0, MAX_HOSPITALITY_BANNER_IMAGES);
};

export const normalizeHospitalityBannerSlots = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, MAX_HOSPITALITY_BANNER_IMAGES)
    .map((item) => String(item ?? '').trim());
};

export const mergeHospitalityBannerSlots = (urlSlots: unknown, uploadedSlots: unknown): string[] => {
  const normalizedUrls = normalizeHospitalityBannerSlots(urlSlots);
  const normalizedUploads = normalizeHospitalityBannerSlots(uploadedSlots);
  return Array.from(
    { length: MAX_HOSPITALITY_BANNER_IMAGES },
    (_, index) => normalizedUploads[index] || normalizedUrls[index] || ''
  );
};
