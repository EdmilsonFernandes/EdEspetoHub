export const JNC_PUBLIC_ORIGIN = 'https://janocaminho.com.br';
export const JNC_GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=com.janocaminho.app&hl=pt_BR';
export const JNC_IOS_HUB_URL = `${JNC_PUBLIC_ORIGIN}/hub`;

export type HospitalityQrPosterInput = {
  destinationSlug?: string | null;
  destinationName?: string | null;
  placeSlug?: string | null;
  placeName?: string | null;
};

export const sanitizePosterFileSegment = (value?: string | null, fallback = 'chale') => {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return normalized || fallback;
};

export const escapePosterHtml = (value?: string | null) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const buildHospitalityPlacePublicPath = ({ destinationSlug, placeSlug }: HospitalityQrPosterInput) => {
  const destination = String(destinationSlug || '').trim();
  const place = String(placeSlug || '').trim();
  if (!destination || !place) return '';
  return `/destinos/${encodeURIComponent(destination)}/chales/${encodeURIComponent(place)}`;
};

export const buildHospitalityPlaceInstallUrl = (input: HospitalityQrPosterInput, origin = JNC_PUBLIC_ORIGIN) => {
  const base = String(origin || JNC_PUBLIC_ORIGIN).replace(/\/+$/, '') || JNC_PUBLIC_ORIGIN;
  const params = new URLSearchParams({ origem: 'qr-chale' });
  const publicPath = buildHospitalityPlacePublicPath(input);

  if (input.destinationSlug) params.set('destino', String(input.destinationSlug));
  if (input.placeSlug) params.set('chale', String(input.placeSlug));
  if (input.destinationName) params.set('cidade', String(input.destinationName));
  if (input.placeName) params.set('nome', String(input.placeName));
  if (publicPath) params.set('next', publicPath);

  return `${base}/instalar?${params.toString()}`;
};

export const buildHospitalityPlacePlayStoreQrUrl = () => JNC_GOOGLE_PLAY_URL;

export const buildHospitalityPlaceSmartQrUrl = (input: HospitalityQrPosterInput, origin = JNC_PUBLIC_ORIGIN) => {
  const installUrl = buildHospitalityPlaceInstallUrl(input, origin);
  return `${installUrl}&redirect=auto`;
};

export const resolveHospitalityQrRedirectUrl = (userAgent?: string | null) => {
  const normalized = String(userAgent || '').toLowerCase();
  const isAndroid = normalized.includes('android');
  const isIos =
    normalized.includes('iphone') ||
    normalized.includes('ipad') ||
    normalized.includes('ipod') ||
    (normalized.includes('macintosh') && normalized.includes('mobile'));

  if (isIos) return JNC_IOS_HUB_URL;
  if (isAndroid) return JNC_GOOGLE_PLAY_URL;
  return '';
};

export const buildHospitalityPlacePosterFileName = (placeName?: string | null) =>
  `qr-app-${sanitizePosterFileSegment(placeName, 'hospedagem')}.html`;
