export const getStoreAvatarUrl = (seed?: string | null, fallbackName?: string | null) => {
  const rawSeed = String(seed || fallbackName || 'ja-no-caminho').trim();
  const normalizedSeed = rawSeed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase();

  return `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(
    normalizedSeed || 'ja-no-caminho'
  )}&backgroundType=gradientLinear&radius=24`;
};
