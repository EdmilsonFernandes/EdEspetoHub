import { AppDataSource } from '../config/database';
import { GeoLocationService } from '../services/GeoLocationService';
import { runMigrations } from '../utils/runMigrations';
import { logger } from '../utils/logger';

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
  destinationLat?: number | null;
  destinationLng?: number | null;
};

const log = logger.child({ scope: 'BackfillDestinationCoordinates' });
const geoLocationService = new GeoLocationService();

const text = (value: unknown) => {
  const normalized = String(value || '').trim();
  return normalized || null;
};

const buildAddress = (row: Candidate) =>
  [
    text(row.address),
    text(row.addressNumber),
    text(row.district),
    text(row.city),
    text(row.state)?.toUpperCase().slice(0, 2),
    String(row.zipCode || '').replace(/\D/g, '').slice(0, 8) || null,
  ].filter(Boolean).join(', ');

const hasCoordinatePair = (lat?: number | null, lng?: number | null) =>
  lat !== null &&
  lat !== undefined &&
  lng !== null &&
  lng !== undefined &&
  Number.isFinite(Number(lat)) &&
  Number.isFinite(Number(lng));

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
      td.lat AS "destinationLat",
      td.lng AS "destinationLng"
    FROM hospitality_places hp
    JOIN travel_destinations td ON td.id = hp.destination_id
    WHERE (hp.lat IS NULL OR hp.lng IS NULL)
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
      td.lat AS "destinationLat",
      td.lng AS "destinationLng"
    FROM destination_listings dl
    JOIN travel_destinations td ON td.id = dl.destination_id
    WHERE (dl.lat IS NULL OR dl.lng IS NULL)
      AND COALESCE(dl.address, dl.city, dl.state, dl.zip_code) IS NOT NULL
    ORDER BY kind, name;
  `);
  return rows as Candidate[];
};

const updateCoordinates = async (candidate: Candidate, lat: number, lng: number) => {
  const table = candidate.kind === 'hospitality_place' ? 'hospitality_places' : 'destination_listings';
  await AppDataSource.query(
    `UPDATE ${table} SET lat = $1, lng = $2, updated_at = NOW() WHERE id = $3;`,
    [lat, lng, candidate.id]
  );
};

const applyDestinationFallback = async (candidate: Candidate, shouldApply: boolean) => {
  if (!hasCoordinatePair(candidate.destinationLat, candidate.destinationLng)) return false;
  if (shouldApply) {
    await updateCoordinates(candidate, Number(candidate.destinationLat), Number(candidate.destinationLng));
  }
  log.info('Destination coordinate resolved from destination fallback', {
    mode: shouldApply ? 'apply' : 'dry-run',
    kind: candidate.kind,
    name: candidate.name,
    lat: Number(candidate.destinationLat),
    lng: Number(candidate.destinationLng),
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

    try {
      const geocoded = await geoLocationService.geocodeAddress(address);
      if (!geocoded) {
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
        await updateCoordinates(candidate, Number(geocoded.lat), Number(geocoded.lng));
      }
      log.info('Destination coordinate resolved', {
        mode: shouldApply ? 'apply' : 'dry-run',
        kind: candidate.kind,
        name: candidate.name,
        lat: Number(geocoded.lat),
        lng: Number(geocoded.lng),
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
