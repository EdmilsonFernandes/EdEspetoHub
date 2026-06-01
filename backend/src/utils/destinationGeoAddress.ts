export type DestinationGeoAddressInput = {
  address?: string | null;
  addressNumber?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
};

export type DestinationGeoZipLookup = {
  street?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
} | null;

const text = (value: unknown) => {
  const normalized = String(value || '').replace(/\s{2,}/g, ' ').trim();
  return normalized || null;
};

const normalizeComparableText = (value: unknown) => String(value || '')
  .replace(/\s{2,}/g, ' ')
  .trim()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const stripDistrictPrefix = (value: string) => value.replace(/^(bairro do|bairro da|bairro de|bairro)\s+/i, '').trim();

const streetHasExplicitNumber = (street: string | null) => {
  if (!street) return false;
  return (
    /,\s*(?:n[ºo]\.?\s*)?\d+[a-z]?(?:\b|[^a-z0-9])/i.test(street) ||
    /\bn[ºo]\.?\s*\d+[a-z]?\b/i.test(street) ||
    /\bn[uú]mero\s*\d+[a-z]?\b/i.test(street) ||
    /\s+\d+[a-z]?\s*$/.test(street.trim())
  );
};

const streetWithNumber = (street: string | null, number: string | null) => (
  street && number && !streetHasExplicitNumber(street) ? `${street}, ${number}` : street
);

const districtAlreadyInStreet = (street: string | null, district: string | null) => {
  if (!street || !district) return false;
  const normalizedStreet = normalizeComparableText(street);
  const normalizedDistrict = normalizeComparableText(stripDistrictPrefix(district));
  return normalizedDistrict.length >= 3 && normalizedStreet.includes(normalizedDistrict);
};

const districtForAddress = (payload: DestinationGeoAddressInput) => {
  const street = text(payload.address);
  const district = text(payload.district);
  return district && !districtAlreadyInStreet(street, district) ? district : null;
};

const stateCode = (value: unknown) => {
  const normalized = String(value || '').trim().toUpperCase();
  return normalized ? normalized.slice(0, 2) : null;
};

const zipCode = (value: unknown) => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
  return digits || text(value);
};

const unique = (values: Array<string | null | undefined>) => {
  const seen = new Set<string>();
  return values
    .map((value) => String(value || '').trim())
    .filter((value) => {
      if (!value) return false;
      const key = value.toLocaleLowerCase('pt-BR');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const mergeLookup = (payload: DestinationGeoAddressInput, lookup?: DestinationGeoZipLookup): DestinationGeoAddressInput => ({
  address: text(payload.address) || text(lookup?.street),
  addressNumber: text(payload.addressNumber),
  district: text(payload.district) || text(lookup?.district),
  city: text(payload.city) || text(lookup?.city),
  state: stateCode(payload.state) || stateCode(lookup?.state),
  zipCode: zipCode(payload.zipCode) || zipCode(lookup?.zipCode),
});

const streetLines = (payload: DestinationGeoAddressInput) => {
  const street = text(payload.address);
  const number = text(payload.addressNumber);
  if (!street) return [];
  const line = streetWithNumber(street, number);
  return unique([
    line,
    number && !streetHasExplicitNumber(street) ? `${number} ${street}` : null,
  ]);
};

export const buildDestinationGeocodeAddress = (
  payload: DestinationGeoAddressInput,
  options?: { includeZip?: boolean; includeCountry?: boolean }
) => {
  const includeZip = options?.includeZip !== false;
  const includeCountry = Boolean(options?.includeCountry);
  return [
    streetWithNumber(text(payload.address), text(payload.addressNumber)),
    districtForAddress(payload),
    text(payload.city),
    stateCode(payload.state),
    includeZip ? zipCode(payload.zipCode) : null,
    includeCountry ? 'Brasil' : null,
  ].filter(Boolean).join(', ');
};

export const buildDestinationGeocodeCandidates = (
  payload: DestinationGeoAddressInput,
  lookup?: DestinationGeoZipLookup
) => {
  const userAddress = mergeLookup(payload, null);
  const lookupAddress = mergeLookup(payload, lookup);

  const buildStreetCandidates = (source: DestinationGeoAddressInput, includeZip: boolean) => {
    const city = text(source.city);
    const state = stateCode(source.state);
    if (!city || !state) return [];

    const lines = streetLines(source);
    return unique([
      ...lines.map((streetLine) => [
        streetLine,
        districtForAddress(source),
        city,
        state,
        includeZip ? zipCode(source.zipCode) : null,
        'Brasil',
      ].filter(Boolean).join(', ')),
      ...lines.map((streetLine) => [
        streetLine,
        city,
        state,
        includeZip ? zipCode(source.zipCode) : null,
        'Brasil',
      ].filter(Boolean).join(', ')),
    ]);
  };

  return unique([
    ...buildStreetCandidates(userAddress, false),
    ...buildStreetCandidates(lookupAddress, false),
    ...buildStreetCandidates(userAddress, true),
    ...buildStreetCandidates(lookupAddress, true),
  ]);
};
