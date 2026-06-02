import { AppDataSource } from '../config/database';
import type { DestinationListingCategory, HospitalityPlaceType } from './destinationHub';

export type TourismGeoSeed = {
  lat: number;
  lng: number;
  formattedAddress: string;
  precision?: 'street' | 'city' | 'unknown';
};

export type TourismDestinationSeed = {
  name: string;
  slug: string;
  city: string;
  state: string;
  description: string;
  heroTitle: string;
  heroSubtitle: string;
  lat: number;
  lng: number;
  sortOrder: number;
};

export type TourismHospitalitySeed = {
  name: string;
  slug: string;
  type: HospitalityPlaceType;
  address: string;
  addressNumber: string;
  district: string;
  zipCode: string;
  phone?: string;
  whatsapp?: string;
  instagramUrl?: string;
  websiteUrl?: string;
  amenities?: string[];
  geo: TourismGeoSeed;
  sourceUrl: string;
  sortOrder: number;
};

export type TourismListingSeed = {
  title: string;
  category: DestinationListingCategory;
  address: string;
  addressNumber: string;
  district: string;
  zipCode: string;
  phone?: string;
  whatsapp?: string;
  instagramUrl?: string;
  websiteUrl?: string;
  featured?: boolean;
  geo: TourismGeoSeed;
  sourceUrl: string;
  sortOrder: number;
};

export type TourismSeedConfig = {
  destination: TourismDestinationSeed;
  hospitality: TourismHospitalitySeed[];
  listings: TourismListingSeed[];
  destinationDescription: string;
  placeDescription: (seed: TourismHospitalitySeed) => string;
  listingDescription: (seed: TourismListingSeed) => string;
};

const getCtaType = (seed: TourismListingSeed) => {
  if (seed.whatsapp) return 'WHATSAPP';
  if (seed.websiteUrl || seed.instagramUrl) return 'SITE';
  return null;
};

const getCtaUrl = (seed: TourismListingSeed) => seed.whatsapp || seed.websiteUrl || seed.instagramUrl || null;

const seedDestination = async (config: TourismSeedConfig) => {
  const seed = config.destination;
  const rows: Array<{ id: string }> = await AppDataSource.query(
    `
      INSERT INTO travel_destinations (
        name,
        slug,
        city,
        state,
        description,
        hero_title,
        hero_subtitle,
        lat,
        lng,
        active,
        sort_order,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10, NOW())
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        description = EXCLUDED.description,
        hero_title = EXCLUDED.hero_title,
        hero_subtitle = EXCLUDED.hero_subtitle,
        lat = EXCLUDED.lat,
        lng = EXCLUDED.lng,
        active = TRUE,
        sort_order = EXCLUDED.sort_order,
        updated_at = NOW()
      RETURNING id;
    `,
    [
      seed.name,
      seed.slug,
      seed.city,
      seed.state,
      config.destinationDescription,
      seed.heroTitle,
      seed.heroSubtitle,
      seed.lat,
      seed.lng,
      seed.sortOrder,
    ]
  );

  return rows[0]?.id;
};

const seedHospitalityPlaces = async (config: TourismSeedConfig, destinationId: string) => {
  let saved = 0;

  for (const seed of config.hospitality) {
    await AppDataSource.query(
      `
        INSERT INTO hospitality_places (
          destination_id,
          name,
          slug,
          type,
          description,
          address,
          address_number,
          district,
          city,
          state,
          zip_code,
          lat,
          lng,
          geo_source,
          geo_precision,
          geo_verified,
          geocoded_at,
          formatted_address,
          phone,
          whatsapp,
          instagram_url,
          website_url,
          amenities,
          delivery_instructions,
          sort_order,
          active,
          updated_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13,
          'geocoder',
          $14,
          FALSE,
          NOW(),
          $15,
          $16,
          $17,
          $18,
          $19,
          $20::jsonb,
          $21,
          $22,
          TRUE,
          NOW()
        )
        ON CONFLICT (destination_id, slug) DO UPDATE SET
          name = EXCLUDED.name,
          type = EXCLUDED.type,
          description = EXCLUDED.description,
          address = EXCLUDED.address,
          address_number = EXCLUDED.address_number,
          district = EXCLUDED.district,
          city = EXCLUDED.city,
          state = EXCLUDED.state,
          zip_code = EXCLUDED.zip_code,
          lat = EXCLUDED.lat,
          lng = EXCLUDED.lng,
          geo_source = EXCLUDED.geo_source,
          geo_precision = EXCLUDED.geo_precision,
          geo_verified = FALSE,
          geocoded_at = EXCLUDED.geocoded_at,
          formatted_address = EXCLUDED.formatted_address,
          phone = EXCLUDED.phone,
          whatsapp = EXCLUDED.whatsapp,
          instagram_url = EXCLUDED.instagram_url,
          website_url = EXCLUDED.website_url,
          amenities = EXCLUDED.amenities,
          delivery_instructions = EXCLUDED.delivery_instructions,
          sort_order = EXCLUDED.sort_order,
          active = TRUE,
          updated_at = NOW();
      `,
      [
        destinationId,
        seed.name,
        seed.slug,
        seed.type,
        config.placeDescription(seed),
        seed.address,
        seed.addressNumber,
        seed.district,
        config.destination.city,
        config.destination.state,
        seed.zipCode,
        seed.geo.lat,
        seed.geo.lng,
        seed.geo.precision || 'street',
        seed.geo.formattedAddress,
        seed.phone || null,
        seed.whatsapp || null,
        seed.instagramUrl || null,
        seed.websiteUrl || null,
        JSON.stringify(seed.amenities || []),
        'Confirmar o melhor ponto de entrega com a hospedagem ou com o responsavel antes de finalizar o pedido.',
        seed.sortOrder,
      ]
    );
    saved += 1;
  }

  return saved;
};

const upsertListing = async (config: TourismSeedConfig, destinationId: string, seed: TourismListingSeed) => {
  const rows: Array<{ id: string }> = await AppDataSource.query(
    `
      WITH existing AS (
        SELECT id
        FROM destination_listings
        WHERE destination_id = $1
          AND store_id IS NULL
          AND lower(title) = lower($2)
        ORDER BY created_at ASC
        LIMIT 1
      ),
      updated AS (
        UPDATE destination_listings
        SET
          category = $3,
          description = $4,
          address = $5,
          address_number = $6,
          district = $7,
          city = $8,
          state = $9,
          zip_code = $10,
          lat = $11,
          lng = $12,
          geo_source = 'geocoder',
          geo_precision = $13,
          geo_verified = FALSE,
          geocoded_at = NOW(),
          formatted_address = $14,
          phone = $15,
          whatsapp = $16,
          instagram_url = $17,
          website_url = $18,
          cta_type = $19,
          cta_url = $20,
          featured = $21,
          sort_order = $22,
          active = TRUE,
          updated_at = NOW()
        WHERE id = (SELECT id FROM existing)
        RETURNING id
      )
      INSERT INTO destination_listings (
        destination_id,
        category,
        title,
        description,
        address,
        address_number,
        district,
        city,
        state,
        zip_code,
        lat,
        lng,
        geo_source,
        geo_precision,
        geo_verified,
        geocoded_at,
        formatted_address,
        phone,
        whatsapp,
        instagram_url,
        website_url,
        cta_type,
        cta_url,
        featured,
        sort_order,
        active,
        updated_at
      )
      SELECT
        $1,
        $3,
        $2,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12,
        'geocoder',
        $13,
        FALSE,
        NOW(),
        $14,
        $15,
        $16,
        $17,
        $18,
        $19,
        $20,
        $21,
        $22,
        TRUE,
        NOW()
      WHERE NOT EXISTS (SELECT 1 FROM updated)
      RETURNING id;
    `,
    [
      destinationId,
      seed.title,
      seed.category,
      config.listingDescription(seed),
      seed.address,
      seed.addressNumber || null,
      seed.district,
      config.destination.city,
      config.destination.state,
      seed.zipCode,
      seed.geo.lat,
      seed.geo.lng,
      seed.geo.precision || 'street',
      seed.geo.formattedAddress,
      seed.phone || null,
      seed.whatsapp || null,
      seed.instagramUrl || null,
      seed.websiteUrl || null,
      getCtaType(seed),
      getCtaUrl(seed),
      seed.featured === true,
      seed.sortOrder,
    ]
  );

  if (rows[0]?.id) return rows[0].id;

  const updatedRows: Array<{ id: string }> = await AppDataSource.query(
    `
      SELECT id
      FROM destination_listings
      WHERE destination_id = $1
        AND store_id IS NULL
        AND lower(title) = lower($2)
      ORDER BY created_at ASC
      LIMIT 1;
    `,
    [destinationId, seed.title]
  );

  return updatedRows[0]?.id || null;
};

const linkAllActiveListingsToHospitalityPlaces = async (destinationId: string) => {
  await AppDataSource.query(
    `
      INSERT INTO destination_listing_hospitality_places (listing_id, hospitality_place_id, sort_order)
      SELECT dl.id, hp.id, COALESCE(dl.sort_order, 0) + COALESCE(hp.sort_order, 0)
      FROM destination_listings dl
      CROSS JOIN hospitality_places hp
      WHERE dl.destination_id = $1
        AND hp.destination_id = $1
        AND dl.active = TRUE
        AND hp.active = TRUE
      ON CONFLICT (listing_id, hospitality_place_id) DO UPDATE SET
        sort_order = EXCLUDED.sort_order;
    `,
    [destinationId]
  );
};

const seedListings = async (config: TourismSeedConfig, destinationId: string) => {
  let saved = 0;

  for (const seed of config.listings) {
    const listingId = await upsertListing(config, destinationId, seed);
    if (!listingId) {
      throw new Error(`Nao foi possivel criar ou atualizar o cadastro ${seed.title}.`);
    }
    saved += 1;
  }

  await linkAllActiveListingsToHospitalityPlaces(destinationId);

  return saved;
};

export const seedTourismDestinationMap = async (config: TourismSeedConfig) => {
  const destinationId = await seedDestination(config);
  if (!destinationId) {
    throw new Error(`Nao foi possivel criar ou localizar o destino ${config.destination.name}.`);
  }

  const placesCount = await seedHospitalityPlaces(config, destinationId);
  const listingsCount = await seedListings(config, destinationId);

  return {
    destinationId,
    placesCount,
    listingsCount,
  };
};
