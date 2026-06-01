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
  void native;
  return encodedMessage
    ? `https://api.whatsapp.com/send?phone=${normalizedPhone}&text=${encodedMessage}`
    : `https://api.whatsapp.com/send?phone=${normalizedPhone}`;
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

type DestinationAddressLineInput = {
  address?: string | null;
  addressNumber?: string | number | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
};

const normalizeInlineText = (value?: string | number | null) => String(value || '').replace(/\s+/g, ' ').trim();

const normalizeZipCodeForDisplay = (value?: string | null) => {
  const raw = normalizeInlineText(value);
  const digits = raw.replace(/\D/g, '');
  return digits.length === 8 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : raw;
};

const normalizeComparableText = (value?: string | number | null) => normalizeInlineText(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const stripDistrictPrefix = (value: string) => value.replace(/^(bairro do|bairro da|bairro de|bairro)\s+/i, '').trim();

const streetHasExplicitNumber = (street: string) => {
  if (!street) return false;
  return (
    /,\s*(?:n[ºo]\.?\s*)?\d+[a-z]?(?:\b|[^a-z0-9])/i.test(street) ||
    /\bn[ºo]\.?\s*\d+[a-z]?\b/i.test(street) ||
    /\bn[uú]mero\s*\d+[a-z]?\b/i.test(street) ||
    /\s+\d+[a-z]?\s*$/.test(street.trim())
  );
};

const streetWithNumber = (street: string, number: string) => (
  street && number && !streetHasExplicitNumber(street) ? `${street}, nº ${number}` : street
);

const streetWithRouteNumber = (street: string, number: string) => (
  street && number && !streetHasExplicitNumber(street) ? `${street}, ${number}` : street
);

const districtAlreadyInStreet = (street: string, district: string) => {
  const normalizedStreet = normalizeComparableText(street);
  const normalizedDistrict = normalizeComparableText(stripDistrictPrefix(district));
  return normalizedDistrict.length >= 3 && normalizedStreet.includes(normalizedDistrict);
};

export const buildDestinationAddressLine = ({
  address,
  addressNumber,
  district,
  city,
  state,
  zipCode,
}: DestinationAddressLineInput, options?: { includeZip?: boolean }) => {
  const street = normalizeInlineText(address);
  const number = normalizeInlineText(addressNumber);
  const districtText = normalizeInlineText(district);
  const districtLine = districtText && !districtAlreadyInStreet(street, districtText) ? districtText : '';
  const cityState = [city, state].map((value) => normalizeInlineText(value)).filter(Boolean).join(' - ');
  const zip = normalizeZipCodeForDisplay(zipCode);
  return [
    streetWithNumber(street, number),
    districtLine,
    cityState,
    options?.includeZip === false || !zip ? '' : `CEP ${zip}`,
  ].filter(Boolean).join(' · ');
};

export const buildDestinationRouteAddressLine = (payload: DestinationAddressLineInput) =>
  [
    streetWithRouteNumber(normalizeInlineText(payload.address), normalizeInlineText(payload.addressNumber)),
    normalizeInlineText(payload.district) && !districtAlreadyInStreet(normalizeInlineText(payload.address), normalizeInlineText(payload.district))
      ? normalizeInlineText(payload.district)
      : '',
    normalizeInlineText(payload.city),
    normalizeInlineText(payload.state),
    'Brasil',
  ].filter(Boolean).join(', ');

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
  serviceId,
  serviceAddress,
  serviceAddressNumber,
  serviceDistrict,
  serviceCity,
  serviceState,
  serviceZipCode,
  serviceLat,
  serviceLng,
  placeName,
  placeAddress,
  placeAddressNumber,
  placeDistrict,
  placeCity,
  placeState,
  placeZipCode,
  placeLat,
  placeLng,
}: {
  destinationSlug?: string | null;
  placeSlug?: string | null;
  serviceName?: string | null;
  serviceId?: string | null;
  serviceAddress?: string | null;
  serviceAddressNumber?: string | number | null;
  serviceDistrict?: string | null;
  serviceCity?: string | null;
  serviceState?: string | null;
  serviceZipCode?: string | null;
  serviceLat?: string | number | null;
  serviceLng?: string | number | null;
  placeName?: string | null;
  placeAddress?: string | null;
  placeAddressNumber?: string | number | null;
  placeDistrict?: string | null;
  placeCity?: string | null;
  placeState?: string | null;
  placeZipCode?: string | null;
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
  const compactServiceId = String(serviceId || '').trim();

  append('servico', compactServiceId);
  if (!compactServiceId) {
    append('serviceName', serviceName);
    append('serviceAddress', serviceAddress);
    append('serviceAddressNumber', serviceAddressNumber);
    append('serviceDistrict', serviceDistrict);
    append('serviceCity', serviceCity);
    append('serviceState', serviceState);
    append('serviceZipCode', serviceZipCode);
    append('serviceLat', serviceLat);
    append('serviceLng', serviceLng);
    append('placeName', placeName);
    append('placeAddress', placeAddress);
    append('placeAddressNumber', placeAddressNumber);
    append('placeDistrict', placeDistrict);
    append('placeCity', placeCity);
    append('placeState', placeState);
    append('placeZipCode', placeZipCode);
    append('placeLat', placeLat);
    append('placeLng', placeLng);
  }

  const suffix = params.toString() ? `?${params.toString()}` : '';
  return `${base}/destinos/${encodeURIComponent(destination)}/chales/${encodeURIComponent(place)}/rota${suffix}`;
};

const buildLocationMessageLines = ({
  label,
  address,
  addressNumber,
  district,
  city,
  state,
  zipCode,
  lat,
  lng,
}: {
  label: string;
  address?: string | null;
  addressNumber?: string | number | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  lat?: string | number | null;
  lng?: string | number | null;
}) => {
  const safeAddress = buildDestinationAddressLine({ address, addressNumber, district, city, state, zipCode });
  const mapUrl = buildDestinationMapUrl({ address: safeAddress, lat, lng });
  if (!safeAddress && !mapUrl) return [];

  return [
    safeAddress ? `${label}: ${safeAddress}` : '',
    mapUrl ? `Abrir localização: ${mapUrl}` : '',
  ].filter(Boolean);
};

const buildHospitalityDeliveryReferenceLines = ({
  placeName,
  placeAddress,
  placeAddressNumber,
  placeDistrict,
  placeCity,
  placeState,
  placeZipCode,
  placeLat,
  placeLng,
}: {
  placeName?: string | null;
  placeAddress?: string | null;
  placeAddressNumber?: string | number | null;
  placeDistrict?: string | null;
  placeCity?: string | null;
  placeState?: string | null;
  placeZipCode?: string | null;
  placeLat?: string | number | null;
  placeLng?: string | number | null;
}) => {
  const safePlaceName = String(placeName || '').trim();
  const safeAddress = buildDestinationAddressLine({
    address: placeAddress,
    addressNumber: placeAddressNumber,
    district: placeDistrict,
    city: placeCity,
    state: placeState,
    zipCode: placeZipCode,
  });
  const mapUrl = buildDestinationMapUrl({ address: safeAddress, lat: placeLat, lng: placeLng });

  if (!safePlaceName && !safeAddress && !mapUrl) return [];

  return [
    safePlaceName ? `Estou hospedado(a) em: ${safePlaceName}` : '',
    safeAddress ? `Endereço para entrega: ${safeAddress}` : '',
    mapUrl ? `Localização do chalé: ${mapUrl}` : '',
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
  placeAddressNumber,
  placeDistrict,
  placeCity,
  placeState,
  placeZipCode,
  placeLat,
  placeLng,
  itemAddress,
  itemAddressNumber,
  itemDistrict,
  itemCity,
  itemState,
  itemZipCode,
  itemLat,
  itemLng,
  itemId,
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
  placeAddressNumber?: string | number | null;
  placeDistrict?: string | null;
  placeCity?: string | null;
  placeState?: string | null;
  placeZipCode?: string | null;
  placeLat?: string | number | null;
  placeLng?: string | number | null;
  itemAddress?: string | null;
  itemAddressNumber?: string | number | null;
  itemDistrict?: string | null;
  itemCity?: string | null;
  itemState?: string | null;
  itemZipCode?: string | null;
  itemLat?: string | number | null;
  itemLng?: string | number | null;
  itemId?: string | null;
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
    placeAddressNumber,
    placeDistrict,
    placeCity,
    placeState,
    placeZipCode,
    placeLat,
    placeLng,
  });
  const itemLocationLines = buildLocationMessageLines({
    label: typeLabel.includes('hospedagem') ? 'Endereço da hospedagem' : 'Endereço do atendimento',
    address: resolvedItemAddress,
    addressNumber: itemAddressNumber,
    district: itemDistrict,
    city: itemCity,
    state: itemState,
    zipCode: itemZipCode,
    lat: resolvedItemLat,
    lng: resolvedItemLng,
  });
  const shouldIncludeItemLocation = Boolean(itemLocationLines.length) && !hasHospitalityContext;
  const shouldIncludeRouteContext = hasHospitalityContext && !typeLabel.includes('hospedagem');
  const routeContextUrl = shouldIncludeRouteContext ? buildHospitalityServiceRouteUrl({
    destinationSlug,
    placeSlug,
    serviceName: subject,
    serviceId: itemId,
    serviceAddress: resolvedItemAddress,
    serviceAddressNumber: itemAddressNumber,
    serviceDistrict: itemDistrict,
    serviceCity: itemCity,
    serviceState: itemState,
    serviceZipCode: itemZipCode,
    serviceLat: resolvedItemLat,
    serviceLng: resolvedItemLng,
    placeName,
    placeAddress,
    placeAddressNumber,
    placeDistrict,
    placeCity,
    placeState,
    placeZipCode,
    placeLat,
    placeLng,
  }) : '';
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
      ? location ? `Estou em ${location}.` : ''
      : location ? `Estou visitando ${location}.` : '',
    ...hospitalityReferenceLines,
    ...(shouldIncludeItemLocation ? itemLocationLines : []),
    routeContextUrl
      ? `Como chegar até meu chalé: ${routeContextUrl}`
      : appContextUrl ? `Link do Já no Caminho para ver a hospedagem e instalar o app: ${appContextUrl}` : '',
    `Gostaria de saber valores, disponibilidade e se vocês conseguem atender aqui.`,
    'Pode me passar os detalhes, por favor?',
  ].filter(Boolean).join('\n');
};
