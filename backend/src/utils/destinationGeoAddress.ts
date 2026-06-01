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
  return unique([
    number ? `${street}, ${number}` : street,
    number ? `${number} ${street}` : null,
  ]);
};

export const buildDestinationGeocodeAddress = (
  payload: DestinationGeoAddressInput,
  options?: { includeZip?: boolean; includeCountry?: boolean }
) => {
  const includeZip = options?.includeZip !== false;
  const includeCountry = Boolean(options?.includeCountry);
  return [
    text(payload.address),
    text(payload.addressNumber),
    text(payload.district),
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
        text(source.district),
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
