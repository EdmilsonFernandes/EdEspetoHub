import { AppDataSource } from '../config/database';
import { GeoLocationService } from '../services/GeoLocationService';
import { runMigrations } from '../utils/runMigrations';
import { logger } from '../utils/logger';
import { hasUsableBrazilCoordinatePair, isApproximateGeoPrecision, sameCoordinatePair } from '../utils/geoQuality';
import { buildDestinationGeocodeAddress, buildDestinationGeocodeCandidates } from '../utils/destinationGeoAddress';

type Candidate = {
  id: string;
  kind: 'hospitality_place' | 'destination_listing';
  name: string;
  address?: string | null;
  addressNumber?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  lat?: number | null;
  lng?: number | null;
  geoSource?: string | null;
  geoPrecision?: string | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
};

const log = logger.child({ scope: 'BackfillDestinationCoordinates' });
const geoLocationService = new GeoLocationService();

const text = (value: unknown) => {
  const normalized = String(value || '').trim();
  return normalized || null;
};

const buildAddress = (row: Candidate) => buildDestinationGeocodeAddress(row);

const loadCandidates = async (): Promise<Candidate[]> => {
  const rows = await AppDataSource.query(`
    SELECT
      hp.id,
      'hospitality_place' AS kind,
      hp.name,
      hp.address,
      hp.address_number AS "addressNumber",
      hp.district,
      hp.city,
      hp.state,
      hp.zip_code AS "zipCode",
      hp.lat,
      hp.lng,
      hp.geo_source AS "geoSource",
      hp.geo_precision AS "geoPrecision",
      td.lat AS "destinationLat",
      td.lng AS "destinationLng"
    FROM hospitality_places hp
    JOIN travel_destinations td ON td.id = hp.destination_id
    WHERE (
        hp.lat IS NULL
        OR hp.lng IS NULL
        OR COALESCE(hp.geo_precision, 'unknown') IN ('unknown', 'city')
        OR (hp.lat = td.lat AND hp.lng = td.lng)
      )
      AND COALESCE(hp.address, hp.city, hp.state, hp.zip_code) IS NOT NULL
    UNION ALL
    SELECT
      dl.id,
      'destination_listing' AS kind,
      dl.title AS name,
      dl.address,
      dl.address_number AS "addressNumber",
      dl.district,
      dl.city,
      dl.state,
      dl.zip_code AS "zipCode",
      dl.lat,
      dl.lng,
      dl.geo_source AS "geoSource",
      dl.geo_precision AS "geoPrecision",
      td.lat AS "destinationLat",
      td.lng AS "destinationLng"
    FROM destination_listings dl
    JOIN travel_destinations td ON td.id = dl.destination_id
    WHERE (
        dl.lat IS NULL
        OR dl.lng IS NULL
        OR COALESCE(dl.geo_precision, 'unknown') IN ('unknown', 'city')
        OR (dl.lat = td.lat AND dl.lng = td.lng)
      )
      AND COALESCE(dl.address, dl.city, dl.state, dl.zip_code) IS NOT NULL
    ORDER BY kind, name;
  `);
  return rows as Candidate[];
};

const updateCoordinates = async (
  candidate: Candidate,
  lat: number,
  lng: number,
  quality: { source: string; precision: string; formattedAddress?: string | null }
) => {
  const table = candidate.kind === 'hospitality_place' ? 'hospitality_places' : 'destination_listings';
  await AppDataSource.query(
    `
      UPDATE ${table}
      SET lat = $1,
          lng = $2,
          geo_source = $3,
          geo_precision = $4,
          geo_verified = FALSE,
          geocoded_at = NOW(),
          formatted_address = $5,
          updated_at = NOW()
      WHERE id = $6;
    `,
    [lat, lng, quality.source, quality.precision, quality.formattedAddress || null, candidate.id]
  );
};

const applyDestinationFallback = async (candidate: Candidate, shouldApply: boolean) => {
  if (!hasUsableBrazilCoordinatePair(candidate.destinationLat, candidate.destinationLng)) return false;
  if (shouldApply) {
    await updateCoordinates(candidate, Number(candidate.destinationLat), Number(candidate.destinationLng), {
      source: 'city_fallback',
      precision: 'city',
      formattedAddress: buildAddress(candidate),
    });
  }
  log.info('Destination coordinate resolved from destination fallback', {
    mode: shouldApply ? 'apply' : 'dry-run',
    kind: candidate.kind,
    name: candidate.name,
    lat: Number(candidate.destinationLat),
    lng: Number(candidate.destinationLng),
    precision: 'city',
  });
  return true;
};

const run = async () => {
  const shouldApply = String(process.env.APPLY_DESTINATION_COORDINATES || '').toLowerCase() === 'true';
  await AppDataSource.initialize();
  await runMigrations();

  const candidates = await loadCandidates();
  let resolved = 0;
  let failed = 0;

  for (const candidate of candidates) {
    const address = buildAddress(candidate);
    if (!address) continue;
    const hasExistingPreciseCoordinate =
      hasUsableBrazilCoordinatePair(candidate.lat, candidate.lng) &&
      !isApproximateGeoPrecision(candidate.geoPrecision) &&
      !sameCoordinatePair(candidate.lat, candidate.lng, candidate.destinationLat, candidate.destinationLng);
    if (hasExistingPreciseCoordinate) continue;
    const hasStreetLevelAddress = Boolean(text(candidate.address));
    if (!hasStreetLevelAddress) {
      if (await applyDestinationFallback(candidate, shouldApply)) resolved += 1;
      else failed += 1;
      continue;
    }

    try {
      const candidates = buildDestinationGeocodeCandidates(candidate);
      let geocoded = null;
      let resolvedAddress = address;
      for (const candidateAddress of candidates) {
        geocoded = await geoLocationService.geocodeAddress(candidateAddress);
        if (geocoded && hasUsableBrazilCoordinatePair(geocoded.lat, geocoded.lng)) {
          resolvedAddress = candidateAddress;
          break;
        }
      }
      if (!geocoded || !hasUsableBrazilCoordinatePair(geocoded.lat, geocoded.lng)) {
        if (await applyDestinationFallback(candidate, shouldApply)) {
          resolved += 1;
          continue;
        }
        failed += 1;
        log.warn('Destination coordinate not found', { kind: candidate.kind, name: candidate.name, address });
        continue;
      }

      resolved += 1;
      if (shouldApply) {
        await updateCoordinates(candidate, Number(geocoded.lat), Number(geocoded.lng), {
          source: 'geocoder',
          precision: 'street',
          formattedAddress: geocoded.formattedAddress || resolvedAddress,
        });
      }
      log.info('Destination coordinate resolved', {
        mode: shouldApply ? 'apply' : 'dry-run',
        kind: candidate.kind,
        name: candidate.name,
        lat: Number(geocoded.lat),
        lng: Number(geocoded.lng),
        precision: 'street',
        address: resolvedAddress,
      });
    } catch (error) {
      if (await applyDestinationFallback(candidate, shouldApply)) {
        resolved += 1;
        continue;
      }
      failed += 1;
      log.warn('Destination coordinate lookup failed', { kind: candidate.kind, name: candidate.name, address, error });
    }
  }

  log.info('Destination coordinate backfill finished', {
    mode: shouldApply ? 'apply' : 'dry-run',
    candidates: candidates.length,
    resolved,
    failed,
  });
  await AppDataSource.destroy();
};

run().catch(async (error) => {
  log.error('Destination coordinate backfill crashed', { error });
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
  process.exit(1);
});
