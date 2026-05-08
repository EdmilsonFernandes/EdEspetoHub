export const HOME_CONFIG_SETTING_KEY = 'home.config';
export const MAX_HOME_BANNERS = 4;

export type HomeBannerFit = 'cover' | 'contain';

export type HomeBannerConfig = {
  id: string;
  imageUrl: string;
  title: string | null;
  description: string | null;
  actionUrl: string | null;
  order: number;
  active: boolean;
  fit: HomeBannerFit;
};

export type MarketingPopupConfig = {
  imageUrl: string;
  title: string | null;
  description: string | null;
  actionUrl: string | null;
  active: boolean;
  fit: HomeBannerFit;
};

export type HomeConfig = {
  homeBanners: HomeBannerConfig[];
  marketingPopup: MarketingPopupConfig;
};

export type ResolvedHomeConfig = HomeConfig & {
  usesFallback: boolean;
};

const DEFAULT_HOME_BANNERS: HomeBannerConfig[] = [
  {
    id: 'mercado-pago',
    imageUrl: '/marketing/mp01.png',
    title: 'Mercado Pago',
    description: 'Ative sua loja online com pagamento integrado.',
    actionUrl: '/create?plan=trial',
    order: 1,
    active: true,
    fit: 'cover',
  },
  {
    id: 'termica',
    imageUrl: '/marketing/promo-termica-lite.jpg',
    title: 'Operação completa',
    description: 'Pedidos, impressão e fluxo operacional em um só lugar.',
    actionUrl: '/create?plan=trial',
    order: 2,
    active: true,
    fit: 'cover',
  },
  {
    id: 'adega',
    imageUrl: '/marketing/promo-adega-lite.jpg',
    title: 'Adegas e conveniência',
    description: 'Vitrine pronta para segmentos com alto giro.',
    actionUrl: '/create?plan=trial',
    order: 3,
    active: true,
    fit: 'contain',
  },
  {
    id: 'marketing',
    imageUrl: '/marketing/promo-marketing-lite.jpg',
    title: 'Divulgação multissetorial',
    description: 'Destaque sua operação dentro do hub.',
    actionUrl: '/create?plan=trial',
    order: 4,
    active: true,
    fit: 'contain',
  },
];

const DEFAULT_MARKETING_POPUP: MarketingPopupConfig = {
  imageUrl: '/marketing/mpv2.png',
  title: 'Crie sua loja online',
  description: 'Integre pedidos, pagamentos e operação no Já no Caminho.',
  actionUrl: '/create?plan=trial',
  active: true,
  fit: 'cover',
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const sanitizeOptionalText = (value: unknown, maxLen: number) => {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLen);
};

const sanitizeActionUrl = (value: unknown) => {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed.slice(0, 2048);
  if (trimmed.startsWith('/')) return trimmed.slice(0, 2048);
  throw new Error('action_url_invalid');
};

const sanitizeImageUrl = (value: unknown) => {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed.slice(0, 2048);
  if (trimmed.startsWith('/uploads/')) return trimmed.slice(0, 2048);
  if (trimmed.startsWith('/marketing/')) return trimmed.slice(0, 2048);
  throw new Error('image_url_invalid');
};

const sanitizeFit = (value: unknown, fallback: HomeBannerFit = 'cover'): HomeBannerFit =>
  String(value || '').trim().toLowerCase() === 'contain' ? 'contain' : fallback;

const normalizeOrder = (value: unknown, fallback: number) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(1, Math.round(numeric));
};

const normalizeBannerId = (value: unknown, fallbackIndex: number) => {
  const normalized = String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized || `banner-${fallbackIndex + 1}`;
};

const ensureUniqueIds = (banners: HomeBannerConfig[]) => {
  const seen = new Set<string>();
  return banners.map((banner, index) => {
    let nextId = banner.id;
    while (seen.has(nextId)) {
      nextId = `${banner.id}-${index + 1}`;
    }
    seen.add(nextId);
    return {
      ...banner,
      id: nextId,
    };
  });
};

const normalizeBanner = (input: unknown, index: number): HomeBannerConfig => {
  const record = isPlainObject(input) ? input : {};
  const imageUrl = sanitizeImageUrl(record.imageUrl);
  if (!imageUrl) {
    throw new Error('banner_image_required');
  }
  return {
    id: normalizeBannerId(record.id, index),
    imageUrl,
    title: sanitizeOptionalText(record.title, 120),
    description: sanitizeOptionalText(record.description, 320),
    actionUrl: sanitizeActionUrl(record.actionUrl),
    order: normalizeOrder(record.order, index + 1),
    active: Boolean(record.active),
    fit: sanitizeFit(record.fit, 'cover'),
  };
};

const normalizeMarketingPopup = (input: unknown): MarketingPopupConfig => {
  const record = isPlainObject(input) ? input : {};
  const imageUrl = sanitizeImageUrl(record.imageUrl);
  const active = Boolean(record.active);
  if (active && !imageUrl) {
    throw new Error('marketing_popup_image_required');
  }
  return {
    imageUrl,
    title: sanitizeOptionalText(record.title, 120),
    description: sanitizeOptionalText(record.description, 320),
    actionUrl: sanitizeActionUrl(record.actionUrl),
    active,
    fit: sanitizeFit(record.fit, 'cover'),
  };
};

export const getFallbackHomeConfig = (): HomeConfig =>
  cloneJson({
    homeBanners: DEFAULT_HOME_BANNERS,
    marketingPopup: DEFAULT_MARKETING_POPUP,
  });

export const normalizeHomeConfig = (input: unknown): HomeConfig => {
  if (!isPlainObject(input)) {
    throw new Error('home_config_invalid_payload');
  }

  const rawBanners = Array.isArray(input.homeBanners) ? input.homeBanners : [];
  if (rawBanners.length > MAX_HOME_BANNERS) {
    throw new Error('home_banners_limit_exceeded');
  }

  const homeBanners = ensureUniqueIds(
    rawBanners
      .map((banner, index) => normalizeBanner(banner, index))
      .sort((a, b) => a.order - b.order)
      .map((banner, index) => ({
        ...banner,
        order: index + 1,
      }))
  );

  const activeBanners = homeBanners.filter((banner) => banner.active);
  if (activeBanners.length > MAX_HOME_BANNERS) {
    throw new Error('active_home_banners_limit_exceeded');
  }

  return {
    homeBanners,
    marketingPopup: normalizeMarketingPopup(input.marketingPopup),
  };
};

export const resolveHomeConfig = (storedValue?: unknown): ResolvedHomeConfig => {
  if (!storedValue) {
    return {
      ...getFallbackHomeConfig(),
      usesFallback: true,
    };
  }

  try {
    const parsed =
      typeof storedValue === 'string'
        ? JSON.parse(storedValue)
        : storedValue;
    return {
      ...normalizeHomeConfig(parsed),
      usesFallback: false,
    };
  } catch {
    return {
      ...getFallbackHomeConfig(),
      usesFallback: true,
    };
  }
};
