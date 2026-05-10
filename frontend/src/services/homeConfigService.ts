import { apiClient } from '../config/apiClient';
import { forceLogoutAndRedirect, isSessionAuthError } from '../utils/sessionRedirect';

const resolveBaseUrl = () => import.meta.env.VITE_API_BASE_URL || '/api';
const API_BASE_URL = resolveBaseUrl();
const MAX_HOME_BANNERS = 4;

export type HomeBannerFit = 'cover' | 'contain';

export type HomeBannerDraft = {
  id: string;
  imageUrl: string;
  imageFile?: string;
  title: string;
  description: string;
  actionUrl: string;
  actionLabel: string;
  order: number;
  active: boolean;
  fit: HomeBannerFit;
};

export type MarketingPopupDraft = {
  imageUrl: string;
  imageFile?: string;
  title: string;
  description: string;
  actionUrl: string;
  actionLabel: string;
  active: boolean;
  fit: HomeBannerFit;
};

export type HomeConfigPayload = {
  homeBanners: HomeBannerDraft[];
  marketingPopup: MarketingPopupDraft;
  usesFallback?: boolean;
};

export const DEFAULT_HOME_CONFIG: HomeConfigPayload = {
  homeBanners: [
    {
      id: 'mercado-pago',
      imageUrl: '/marketing/mp01.png',
      title: 'Mercado Pago',
      description: 'Ative sua loja online com pagamento integrado.',
      actionUrl: '/create?plan=trial',
      actionLabel: '',
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
      actionLabel: '',
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
      actionLabel: '',
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
      actionLabel: '',
      order: 4,
      active: true,
      fit: 'contain',
    },
  ],
  marketingPopup: {
    imageUrl: '/marketing/mpv2.png',
    title: 'Crie sua loja online',
    description: 'Integre pedidos, pagamentos e operação no Já no Caminho.',
    actionUrl: '/create?plan=trial',
    actionLabel: '',
    active: true,
    fit: 'cover',
  },
  usesFallback: true,
};

const buildUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.message || response.statusText || 'Falha ao processar a configuração da home.';
    if (isSessionAuthError(response.status, message, payload?.code || '')) {
      forceLogoutAndRedirect('superadmin');
    }
    throw new Error(message);
  }
  return response.json();
};

const sanitizeText = (value: unknown) => String(value || '').trim();
const sanitizeFit = (value: unknown): HomeBannerFit =>
  String(value || '').trim().toLowerCase() === 'contain' ? 'contain' : 'cover';
const sanitizeOrder = (value: unknown, fallback: number) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(1, Math.round(numeric)) : fallback;
};

const normalizeBanner = (banner: any, index: number): HomeBannerDraft => ({
  id: sanitizeText(banner?.id) || `banner-${index + 1}`,
  imageUrl: sanitizeText(banner?.imageUrl),
  imageFile: sanitizeText(banner?.imageFile) || '',
  title: sanitizeText(banner?.title),
  description: sanitizeText(banner?.description),
  actionUrl: sanitizeText(banner?.actionUrl),
  actionLabel: sanitizeText(banner?.actionLabel),
  order: sanitizeOrder(banner?.order, index + 1),
  active: Boolean(banner?.active),
  fit: sanitizeFit(banner?.fit),
});

const normalizePopup = (popup: any): MarketingPopupDraft => ({
  imageUrl: sanitizeText(popup?.imageUrl),
  imageFile: sanitizeText(popup?.imageFile) || '',
  title: sanitizeText(popup?.title),
  description: sanitizeText(popup?.description),
  actionUrl: sanitizeText(popup?.actionUrl),
  actionLabel: sanitizeText(popup?.actionLabel),
  active: Boolean(popup?.active),
  fit: sanitizeFit(popup?.fit),
});

export const normalizeHomeConfigPayload = (payload: any): HomeConfigPayload => {
  const rawBanners = Array.isArray(payload?.homeBanners) ? payload.homeBanners : [];
  const homeBanners: HomeBannerDraft[] = rawBanners
    .slice(0, MAX_HOME_BANNERS)
    .map((banner: any, index: number) => normalizeBanner(banner, index))
    .sort((a: HomeBannerDraft, b: HomeBannerDraft) => a.order - b.order)
    .map((banner: HomeBannerDraft, index: number) => ({
      ...banner,
      order: index + 1,
    }));

  return {
    homeBanners,
    marketingPopup: normalizePopup(payload?.marketingPopup),
    usesFallback: Boolean(payload?.usesFallback),
  };
};

const cloneDefaultConfig = (): HomeConfigPayload =>
  JSON.parse(JSON.stringify(DEFAULT_HOME_CONFIG));

export const homeConfigService = {
  async getPublicConfig() {
    try {
      const payload = await apiClient.get('/public/home-config', { authMode: 'none' });
      return normalizeHomeConfigPayload(payload);
    } catch {
      return cloneDefaultConfig();
    }
  },

  async getAdminConfig(token: string) {
    const response = await fetch(buildUrl('/admin/home-config'), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const payload = await handleResponse(response);
    return normalizeHomeConfigPayload(payload);
  },

  async saveAdminConfig(token: string, payload: HomeConfigPayload) {
    const response = await fetch(buildUrl('/admin/home-config'), {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = await handleResponse(response);
    return normalizeHomeConfigPayload(data);
  },
};
