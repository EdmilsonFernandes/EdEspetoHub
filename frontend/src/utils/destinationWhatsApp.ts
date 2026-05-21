import { JNC_PUBLIC_ORIGIN, buildHospitalityPlaceSmartQrUrl } from './destinationQrPoster';

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

export const buildHospitalityServiceRouteUrl = ({
  destinationSlug,
  placeSlug,
  serviceName,
  serviceAddress,
  serviceLat,
  serviceLng,
  placeName,
  placeAddress,
  placeLat,
  placeLng,
}: {
  destinationSlug?: string | null;
  placeSlug?: string | null;
  serviceName?: string | null;
  serviceAddress?: string | null;
  serviceLat?: string | number | null;
  serviceLng?: string | number | null;
  placeName?: string | null;
  placeAddress?: string | null;
  placeLat?: string | number | null;
  placeLng?: string | number | null;
}, origin = JNC_PUBLIC_ORIGIN) => {
  const destination = String(destinationSlug || '').trim();
  const place = String(placeSlug || '').trim();
  if (!destination || !place) return '';

  const hasPlaceLocation = Boolean(String(placeAddress || '').trim()) || (normalizeCoordinate(placeLat) !== null && normalizeCoordinate(placeLng) !== null);
  if (!hasPlaceLocation) return '';

  const base = String(origin || JNC_PUBLIC_ORIGIN).replace(/\/+$/, '') || JNC_PUBLIC_ORIGIN;
  const params = new URLSearchParams();
  const append = (key: string, value?: string | number | null) => {
    const text = String(value ?? '').trim();
    if (text) params.set(key, text);
  };

  append('serviceName', serviceName);
  append('serviceAddress', serviceAddress);
  append('serviceLat', serviceLat);
  append('serviceLng', serviceLng);
  append('placeName', placeName);
  append('placeAddress', placeAddress);
  append('placeLat', placeLat);
  append('placeLng', placeLng);

  const suffix = params.toString() ? `?${params.toString()}` : '';
  return `${base}/destinos/${encodeURIComponent(destination)}/chales/${encodeURIComponent(place)}/rota${suffix}`;
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

const buildHospitalityDeliveryReferenceLines = ({
  placeName,
  placeAddress,
  placeLat,
  placeLng,
}: {
  placeName?: string | null;
  placeAddress?: string | null;
  placeLat?: string | number | null;
  placeLng?: string | number | null;
}) => {
  const safePlaceName = String(placeName || '').trim();
  const safeAddress = String(placeAddress || '').trim();
  const mapUrl = buildDestinationMapUrl({ address: safeAddress, lat: placeLat, lng: placeLng });

  if (!safePlaceName && !safeAddress && !mapUrl) return [];

  return [
    'Referencia para entrega/atendimento:',
    safePlaceName ? `Hospedagem: ${safePlaceName}` : '',
    safeAddress ? `Endereco da hospedagem: ${safeAddress}` : '',
    mapUrl ? `Mapa da hospedagem: ${mapUrl}` : '',
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
  const resolvedItemAddress = itemAddress ?? address;
  const resolvedItemLat = itemLat ?? lat;
  const resolvedItemLng = itemLng ?? lng;
  const hasHospitalityContext = Boolean(String(placeName || placeAddress || '').trim());
  const hospitalityReferenceLines = buildHospitalityDeliveryReferenceLines({
    placeName,
    placeAddress,
    placeLat,
    placeLng,
  });
  const itemLocationLines = buildLocationMessageLines({
    label: typeLabel.includes('hospedagem') ? 'da hospedagem' : 'do atendimento',
    address: resolvedItemAddress,
    lat: resolvedItemLat,
    lng: resolvedItemLng,
  });
  const shouldIncludeItemLocation = Boolean(itemLocationLines.length) && !hasHospitalityContext;
  const routeContextUrl = buildHospitalityServiceRouteUrl({
    destinationSlug,
    placeSlug,
    serviceName: subject,
    serviceAddress: resolvedItemAddress,
    serviceLat: resolvedItemLat,
    serviceLng: resolvedItemLng,
    placeName,
    placeAddress,
    placeLat,
    placeLng,
  });
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
    hasHospitalityContext
      ? `Estou ${location ? `em ${location} e ` : ''}hospedado(a) em ${String(placeName || 'uma hospedagem cadastrada').trim()}.`
      : location ? `Estou visitando ${location}.` : '',
    ...hospitalityReferenceLines,
    ...(shouldIncludeItemLocation ? itemLocationLines : []),
    routeContextUrl
      ? `Link com rota/referencia para entrega: ${routeContextUrl}`
      : appContextUrl ? `Link do Já no Caminho para ver a hospedagem e instalar o app: ${appContextUrl}` : '',
    `Gostaria de saber mais sobre ${typeLabel}: disponibilidade, valores e como funciona o atendimento.`,
    'Pode me passar os detalhes, por favor?',
  ].filter(Boolean).join('\n');
};
