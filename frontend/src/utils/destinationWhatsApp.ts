import { buildHospitalityPlaceSmartQrUrl } from './destinationQrPoster';

export const normalizeBrazilianContactPhone = (value?: string | null) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('55')) {
    const local = digits.slice(2);
    return local.length === 10 || local.length === 11 ? digits : '';
  }

  return digits.length === 10 || digits.length === 11 ? `55${digits}` : '';
};

export const normalizeWhatsAppPhone = (value?: string | null) => {
  const normalized = normalizeBrazilianContactPhone(value);
  if (!normalized) return '';
  return /^55\d{2}9\d{8}$/.test(normalized) ? normalized : '';
};

export const buildWhatsAppUrl = (phone?: string | null, message?: string, native = false) => {
  const normalizedPhone = normalizeWhatsAppPhone(phone);
  if (!normalizedPhone) return '';
  const encodedMessage = message ? encodeURIComponent(message) : '';
  if (native) {
    return encodedMessage
      ? `whatsapp://send?phone=${normalizedPhone}&text=${encodedMessage}`
      : `whatsapp://send?phone=${normalizedPhone}`;
  }
  return encodedMessage
    ? `https://wa.me/${normalizedPhone}?text=${encodedMessage}`
    : `https://wa.me/${normalizedPhone}`;
};

export const buildPhoneCallUrl = (phone?: string | null) => {
  const normalizedPhone = normalizeBrazilianContactPhone(phone);
  return normalizedPhone ? `tel:+${normalizedPhone}` : '';
};

export const prettifyDestinationLabel = (value?: string | null) => {
  const text = String(value || '').trim();
  if (!text) return '';
  return text
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const normalizeCoordinate = (value?: string | number | null) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

export const buildDestinationMapUrl = ({
  address,
  lat,
  lng,
}: {
  address?: string | null;
  lat?: string | number | null;
  lng?: string | number | null;
}) => {
  const latitude = normalizeCoordinate(lat);
  const longitude = normalizeCoordinate(lng);
  const query = latitude !== null && longitude !== null
    ? `${latitude},${longitude}`
    : String(address || '').trim();

  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : '';
};

const buildLocationMessageLines = ({
  label,
  address,
  lat,
  lng,
}: {
  label: string;
  address?: string | null;
  lat?: string | number | null;
  lng?: string | number | null;
}) => {
  const safeAddress = String(address || '').trim();
  const mapUrl = buildDestinationMapUrl({ address: safeAddress, lat, lng });
  if (!safeAddress && !mapUrl) return [];

  return [
    safeAddress ? `Local ${label}: ${safeAddress}` : '',
    mapUrl ? `Mapa ${label.toLowerCase()}: ${mapUrl}` : '',
  ].filter(Boolean);
};

export const buildDestinationInquiryMessage = ({
  destinationName,
  city,
  state,
  itemName,
  itemType,
  placeName,
  placeAddress,
  placeLat,
  placeLng,
  itemAddress,
  itemLat,
  itemLng,
  address,
  lat,
  lng,
  storeName,
  destinationSlug,
  placeSlug,
}: {
  destinationName?: string | null;
  city?: string | null;
  state?: string | null;
  itemName?: string | null;
  itemType?: string | null;
  placeName?: string | null;
  placeAddress?: string | null;
  placeLat?: string | number | null;
  placeLng?: string | number | null;
  itemAddress?: string | null;
  itemLat?: string | number | null;
  itemLng?: string | number | null;
  address?: string | null;
  lat?: string | number | null;
  lng?: string | number | null;
  storeName?: string | null;
  destinationSlug?: string | null;
  placeSlug?: string | null;
}) => {
  const location = [city || destinationName, state].filter(Boolean).join(' - ');
  const subject = String(itemName || storeName || 'esse atendimento').trim();
  const typeLabel = String(itemType || 'serviço').trim().toLowerCase();
  const context = placeName ? ` enquanto estou vendo opções para ${placeName}` : '';
  const resolvedItemAddress = itemAddress ?? address;
  const resolvedItemLat = itemLat ?? lat;
  const resolvedItemLng = itemLng ?? lng;
  const placeLocationLines = buildLocationMessageLines({
    label: 'da hospedagem',
    address: placeAddress,
    lat: placeLat,
    lng: placeLng,
  });
  const itemLocationLines = buildLocationMessageLines({
    label: typeLabel.includes('hospedagem') ? 'da hospedagem' : 'do atendimento',
    address: resolvedItemAddress,
    lat: resolvedItemLat,
    lng: resolvedItemLng,
  });
  const placeAddressKey = String(placeAddress || '').trim().toLowerCase();
  const itemAddressKey = String(resolvedItemAddress || '').trim().toLowerCase();
  const shouldIncludeItemLocation = Boolean(itemLocationLines.length) && (!placeLocationLines.length || placeAddressKey !== itemAddressKey);
  const appContextUrl = destinationSlug && placeSlug
    ? buildHospitalityPlaceSmartQrUrl({
        destinationSlug,
        placeSlug,
        destinationName: city || destinationName,
        placeName,
      })
    : '';

  return [
    `Olá! Encontrei ${subject} pelo Já no Caminho.`,
    location ? `Estou visitando ${location}${context}.` : context ? `Estou visitando a região${context}.` : '',
    ...placeLocationLines,
    ...(shouldIncludeItemLocation ? itemLocationLines : []),
    appContextUrl ? `Link do Já no Caminho para ver a hospedagem e instalar o app: ${appContextUrl}` : '',
    `Gostaria de saber mais sobre ${typeLabel}: disponibilidade, valores e como funciona o atendimento.`,
    'Pode me passar os detalhes, por favor?',
  ].filter(Boolean).join('\n');
};
