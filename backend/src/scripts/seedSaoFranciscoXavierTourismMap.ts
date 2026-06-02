/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2026 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: seedSaoFranciscoXavierTourismMap.ts
 * @Date: 2026-06-02
 */

import 'reflect-metadata';
import 'dotenv/config';
import { AppDataSource } from '../config/database';
import { runMigrations } from '../utils/runMigrations';
import { logger } from '../utils/logger';
import {
  SAO_FRANCISCO_XAVIER_DESTINATION_SEED,
  SAO_FRANCISCO_XAVIER_HOSPITALITY_SEEDS,
  SAO_FRANCISCO_XAVIER_LISTING_SEEDS,
  SAO_FRANCISCO_XAVIER_TOURISM_SOURCE,
  SaoFranciscoXavierHospitalitySeed,
  SaoFranciscoXavierListingSeed,
} from '../utils/saoFranciscoXavierTourismSeedData';

const log = logger.child({ scope: 'seedSaoFranciscoXavierTourismMap' });

const destinationDescription = `${SAO_FRANCISCO_XAVIER_DESTINATION_SEED.description} Dados factuais importados como curadoria inicial; parcerias oficiais devem ser confirmadas pelos responsaveis.`;

const placeDescription = (seed: SaoFranciscoXavierHospitalitySeed) => {
  const typeLabel =
    seed.type === 'CHALE'
      ? 'Chale'
      : seed.type === 'HOTEL'
        ? 'Hotel'
        : seed.type === 'POUSADA'
          ? 'Pousada'
          : 'Hospedagem';

  return `${typeLabel} em Sao Francisco Xavier cadastrado como curadoria inicial do Ja no Caminho. Fotos, tarifas e regras devem ser confirmadas pelo responsavel.`;
};

const listingDescription = (seed: SaoFranciscoXavierListingSeed) => {
  if (seed.category === 'RESTAURANTE_VISITAR') {
    return 'Lugar para comer ou visitar em Sao Francisco Xavier. Confirme horarios, disponibilidade, entrega e valores diretamente com o estabelecimento.';
  }
  if (seed.category === 'PASSEIO') {
    return 'Experiencia local para visitantes em Sao Francisco Xavier. Confirme disponibilidade, valores e requisitos diretamente com o responsavel.';
  }
  if (seed.category === 'ATRATIVO') {
    return 'Ponto de interesse da curadoria turistica de Sao Francisco Xavier.';
  }
  if (seed.category === 'NOITE') {
    return 'Opcao local para sair ou conhecer a noite em Sao Francisco Xavier. Confirme horarios antes de visitar.';
  }
  if (seed.category === 'LOJA') {
    return 'Compra local e produto regional em Sao Francisco Xavier. Confirme horarios, disponibilidade e valores diretamente com o responsavel.';
  }
  return 'Registro de curadoria local. Confirme horarios, disponibilidade e valores diretamente com o responsavel.';
};

const getCtaType = (seed: SaoFranciscoXavierListingSeed) => {
  if (seed.whatsapp) return 'WHATSAPP';
  if (seed.websiteUrl) return 'SITE';
  if (seed.instagramUrl) return 'SITE';
  return null;
};

const getCtaUrl = (seed: SaoFranciscoXavierListingSeed) => seed.whatsapp || seed.websiteUrl || seed.instagramUrl || null;

const seedDestination = async () => {
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
      SAO_FRANCISCO_XAVIER_DESTINATION_SEED.name,
      SAO_FRANCISCO_XAVIER_DESTINATION_SEED.slug,
      SAO_FRANCISCO_XAVIER_DESTINATION_SEED.city,
      SAO_FRANCISCO_XAVIER_DESTINATION_SEED.state,
      destinationDescription,
      SAO_FRANCISCO_XAVIER_DESTINATION_SEED.heroTitle,
      SAO_FRANCISCO_XAVIER_DESTINATION_SEED.heroSubtitle,
      SAO_FRANCISCO_XAVIER_DESTINATION_SEED.lat,
      SAO_FRANCISCO_XAVIER_DESTINATION_SEED.lng,
      SAO_FRANCISCO_XAVIER_DESTINATION_SEED.sortOrder,
    ]
  );

  return rows[0]?.id;
};

const seedHospitalityPlaces = async (destinationId: string) => {
  let saved = 0;

  for (const seed of SAO_FRANCISCO_XAVIER_HOSPITALITY_SEEDS) {
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
          'street',
          FALSE,
          NOW(),
          $14,
          $15,
          $16,
          $17,
          $18,
          $19::jsonb,
          $20,
          $21,
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
        placeDescription(seed),
        seed.address,
        seed.addressNumber,
        seed.district,
        SAO_FRANCISCO_XAVIER_DESTINATION_SEED.city,
        SAO_FRANCISCO_XAVIER_DESTINATION_SEED.state,
        seed.zipCode,
        seed.geo.lat,
        seed.geo.lng,
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

const upsertListing = async (destinationId: string, seed: SaoFranciscoXavierListingSeed) => {
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
          geo_precision = 'street',
          geo_verified = FALSE,
          geocoded_at = NOW(),
          formatted_address = $13,
          phone = $14,
          whatsapp = $15,
          instagram_url = $16,
          website_url = $17,
          cta_type = $18,
          cta_url = $19,
          featured = $20,
          sort_order = $21,
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
        'street',
        FALSE,
        NOW(),
        $13,
        $14,
        $15,
        $16,
        $17,
        $18,
        $19,
        $20,
        $21,
        TRUE,
        NOW()
      WHERE NOT EXISTS (SELECT 1 FROM updated)
      RETURNING id;
    `,
    [
      destinationId,
      seed.title,
      seed.category,
      listingDescription(seed),
      seed.address,
      seed.addressNumber || null,
      seed.district,
      SAO_FRANCISCO_XAVIER_DESTINATION_SEED.city,
      SAO_FRANCISCO_XAVIER_DESTINATION_SEED.state,
      seed.zipCode,
      seed.geo.lat,
      seed.geo.lng,
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

const linkListingToHospitalityPlaces = async (destinationId: string, listingId: string, sortOrder: number) => {
  await AppDataSource.query(
    `
      INSERT INTO destination_listing_hospitality_places (listing_id, hospitality_place_id, sort_order)
      SELECT $2, hp.id, $3 + COALESCE(hp.sort_order, 0)
      FROM hospitality_places hp
      WHERE hp.destination_id = $1
        AND hp.active = TRUE
      ON CONFLICT (listing_id, hospitality_place_id) DO UPDATE SET
        sort_order = EXCLUDED.sort_order;
    `,
    [destinationId, listingId, sortOrder]
  );
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

const seedListings = async (destinationId: string) => {
  let saved = 0;

  for (const seed of SAO_FRANCISCO_XAVIER_LISTING_SEEDS) {
    const listingId = await upsertListing(destinationId, seed);
    if (!listingId) {
      throw new Error(`Nao foi possivel criar ou atualizar o cadastro ${seed.title}.`);
    }
    await linkListingToHospitalityPlaces(destinationId, listingId, seed.sortOrder);
    saved += 1;
  }

  return saved;
};

const seed = async () => {
  await AppDataSource.initialize();
  await runMigrations();

  const destinationId = await seedDestination();
  if (!destinationId) {
    throw new Error('Nao foi possivel criar ou localizar o destino Sao Francisco Xavier.');
  }

  const placesCount = await seedHospitalityPlaces(destinationId);
  const listingsCount = await seedListings(destinationId);
  await linkAllActiveListingsToHospitalityPlaces(destinationId);

  log.info('Sao Francisco Xavier tourism seed saved', {
    source: SAO_FRANCISCO_XAVIER_TOURISM_SOURCE,
    destinationId,
    placesCount,
    listingsCount,
  });

  await AppDataSource.destroy();
};

seed().catch(async (error) => {
  log.error('Failed to seed Sao Francisco Xavier tourism map', { error });
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  process.exit(1);
});
