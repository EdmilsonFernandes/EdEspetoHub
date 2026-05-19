/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2026 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: seedGoncalvesTourismPdf.ts
 * @Date: 2026-05-18
 */

import 'reflect-metadata';
import 'dotenv/config';
import { AppDataSource } from '../config/database';
import { runMigrations } from '../utils/runMigrations';
import { logger } from '../utils/logger';
import {
  GONCALVES_BANNER_SEEDS,
  GONCALVES_DESTINATION_SEED,
  GONCALVES_HOSPITALITY_SEEDS,
  GONCALVES_LISTING_SEEDS,
  GONCALVES_TOURISM_SOURCE,
  GoncalvesHospitalitySeed,
  GoncalvesListingSeed,
} from '../utils/goncalvesTourismSeedData';

const log = logger.child({ scope: 'seedGoncalvesTourismPdf' });

const destinationDescription = `${GONCALVES_DESTINATION_SEED.description} Dados factuais importados como curadoria inicial; parcerias oficiais devem ser confirmadas pelos responsaveis.`;

const placeDescription = (seed: GoncalvesHospitalitySeed) => {
  const typeLabel =
    seed.type === 'CHALE'
      ? 'Chale'
      : seed.type === 'HOTEL'
        ? 'Hotel'
        : seed.type === 'POUSADA'
          ? 'Pousada'
          : 'Hospedagem';

  return `${typeLabel} em Goncalves cadastrado como curadoria inicial do Ja no Caminho. Fotos, tarifas e regras devem ser confirmadas pelo responsavel.`;
};

const listingDescription = (seed: GoncalvesListingSeed) => {
  if (seed.category === 'RESTAURANTE_VISITAR') {
    return 'Lugar para comer ou visitar em Goncalves. Confirme horarios, disponibilidade e valores diretamente com o estabelecimento.';
  }
  if (seed.category === 'PASSEIO') {
    return 'Experiencia local para visitantes em Goncalves. Confirme disponibilidade, valores e requisitos diretamente com o responsavel.';
  }
  if (seed.category === 'NOITE') {
    return 'Opcao local para sair ou conhecer a noite em Goncalves. Confirme horarios antes de visitar.';
  }
  if (seed.category === 'LOJA') {
    return 'Compra local e produto regional de Goncalves. Confirme horarios, disponibilidade e valores diretamente com o responsavel.';
  }
  return 'Registro de curadoria local. Confirme horarios, disponibilidade e valores diretamente com o responsavel.';
};

const getCtaType = (seed: GoncalvesListingSeed) => {
  if (seed.whatsapp) return 'WHATSAPP';
  if (seed.websiteUrl) return 'SITE';
  if (seed.instagramUrl) return 'SITE';
  return null;
};

const getCtaUrl = (seed: GoncalvesListingSeed) => seed.whatsapp || seed.websiteUrl || seed.instagramUrl || null;

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
      GONCALVES_DESTINATION_SEED.name,
      GONCALVES_DESTINATION_SEED.slug,
      GONCALVES_DESTINATION_SEED.city,
      GONCALVES_DESTINATION_SEED.state,
      destinationDescription,
      GONCALVES_DESTINATION_SEED.heroTitle,
      GONCALVES_DESTINATION_SEED.heroSubtitle,
      GONCALVES_DESTINATION_SEED.lat,
      GONCALVES_DESTINATION_SEED.lng,
      GONCALVES_DESTINATION_SEED.sortOrder,
    ]
  );

  return rows[0]?.id;
};

const seedBanners = async (destinationId: string) => {
  const bannerTitles = GONCALVES_BANNER_SEEDS.map((seed) => seed.title);
  await AppDataSource.query(
    `
      DELETE FROM destination_banners
      WHERE destination_id = $1
        AND title = ANY($2::text[]);
    `,
    [destinationId, bannerTitles]
  );

  for (const seed of GONCALVES_BANNER_SEEDS) {
    await AppDataSource.query(
      `
        INSERT INTO destination_banners (
          destination_id,
          title,
          subtitle,
          sort_order,
          active,
          updated_at
        )
        VALUES ($1, $2, $3, $4, TRUE, NOW());
      `,
      [destinationId, seed.title, seed.subtitle, seed.sortOrder]
    );
  }
};

const seedHospitalityPlaces = async (destinationId: string) => {
  let saved = 0;

  for (const seed of GONCALVES_HOSPITALITY_SEEDS) {
    await AppDataSource.query(
      `
        INSERT INTO hospitality_places (
          destination_id,
          name,
          slug,
          type,
          description,
          address,
          city,
          state,
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
          $13::jsonb,
          $14,
          $15,
          TRUE,
          NOW()
        )
        ON CONFLICT (destination_id, slug) DO UPDATE SET
          name = EXCLUDED.name,
          type = EXCLUDED.type,
          description = EXCLUDED.description,
          address = EXCLUDED.address,
          city = EXCLUDED.city,
          state = EXCLUDED.state,
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
        GONCALVES_DESTINATION_SEED.city,
        GONCALVES_DESTINATION_SEED.state,
        seed.phone || null,
        seed.whatsapp || null,
        seed.instagramUrl || null,
        seed.websiteUrl || null,
        JSON.stringify(seed.amenities || []),
        'Confirmar o melhor ponto de entrega com a hospedagem ou com o responsavel antes de finalizar o pedido.',
        (saved + 1) * 10,
      ]
    );
    saved += 1;
  }

  return saved;
};

const seedListings = async (destinationId: string) => {
  const listingTitles = GONCALVES_LISTING_SEEDS.map((seed) => seed.title);
  await AppDataSource.query(
    `
      DELETE FROM destination_listings
      WHERE destination_id = $1
        AND store_id IS NULL
        AND title = ANY($2::text[]);
    `,
    [destinationId, listingTitles]
  );

  let saved = 0;
  for (const seed of GONCALVES_LISTING_SEEDS) {
    await AppDataSource.query(
      `
        INSERT INTO destination_listings (
          destination_id,
          category,
          title,
          description,
          address,
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
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, TRUE, NOW());
      `,
      [
        destinationId,
        seed.category,
        seed.title,
        listingDescription(seed),
        seed.address || null,
        seed.phone || null,
        seed.whatsapp || null,
        seed.instagramUrl || null,
        seed.websiteUrl || null,
        getCtaType(seed),
        getCtaUrl(seed),
        seed.featured === true,
        (saved + 1) * 10,
      ]
    );
    saved += 1;
  }

  return saved;
};

const seed = async () => {
  await AppDataSource.initialize();
  await runMigrations();

  const destinationId = await seedDestination();
  if (!destinationId) {
    throw new Error('Nao foi possivel criar ou localizar o destino Goncalves.');
  }

  await seedBanners(destinationId);
  const placesCount = await seedHospitalityPlaces(destinationId);
  const listingsCount = await seedListings(destinationId);

  log.info('Goncalves tourism seed saved', {
    source: GONCALVES_TOURISM_SOURCE,
    destinationId,
    placesCount,
    listingsCount,
    bannersCount: GONCALVES_BANNER_SEEDS.length,
  });

  await AppDataSource.destroy();
};

seed().catch(async (error) => {
  log.error('Failed to seed Goncalves tourism data', { error });
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  process.exit(1);
});
