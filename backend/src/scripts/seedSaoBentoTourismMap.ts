/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2026 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: seedSaoBentoTourismMap.ts
 * @Date: 2026-05-11
 */

import 'reflect-metadata';
import 'dotenv/config';
import { AppDataSource } from '../config/database';
import { runMigrations } from '../utils/runMigrations';
import { logger } from '../utils/logger';
import {
  SAO_BENTO_BANNER_SEEDS,
  SAO_BENTO_DESTINATION_SEED,
  SAO_BENTO_HOSPITALITY_SEEDS,
  SAO_BENTO_LISTING_SEEDS,
  SAO_BENTO_TOURISM_SOURCE,
  SaoBentoHospitalitySeed,
  SaoBentoListingSeed,
} from '../utils/saoBentoTourismSeedData';

const log = logger.child({ scope: 'seedSaoBentoTourismMap' });

const destinationDescription = `${SAO_BENTO_DESTINATION_SEED.description} Dados factuais importados como curadoria inicial; parcerias oficiais devem ser confirmadas pelos responsaveis.`;

const placeDescription = (seed: SaoBentoHospitalitySeed) => {
  const typeLabel = seed.type === 'CHALE' ? 'Chale' : seed.type === 'HOTEL' ? 'Hotel' : 'Pousada';
  return `${typeLabel} em Sao Bento do Sapucai cadastrado como curadoria inicial do Ja no Caminho. Fotos, tarifas e regras devem ser confirmadas pelo responsavel.`;
};

const listingDescription = (seed: SaoBentoListingSeed) => {
  if (seed.category === 'RESTAURANTE_VISITAR') {
    return 'Lugar para visitar em Sao Bento do Sapucai. Confirme horarios, disponibilidade e valores diretamente com o estabelecimento.';
  }
  if (seed.category === 'PASSEIO') {
    return 'Experiencia local para visitantes em Sao Bento do Sapucai. Confirme disponibilidade, valores e requisitos diretamente com o responsavel.';
  }
  if (seed.category === 'ATRATIVO') {
    return 'Ponto de interesse da curadoria turistica de Sao Bento do Sapucai.';
  }
  if (seed.category === 'NOITE') {
    return 'Opcao local para sair ou conhecer a noite em Sao Bento do Sapucai. Confirme horarios antes de visitar.';
  }
  return 'Registro de curadoria local. Confirme horarios, disponibilidade e valores diretamente com o responsavel.';
};

const getCtaUrl = (seed: SaoBentoListingSeed) => seed.websiteUrl || null;

const getCtaType = (seed: SaoBentoListingSeed) => {
  if (seed.whatsapp) return 'WHATSAPP';
  if (seed.websiteUrl) return 'SITE';
  return null;
};

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
      SAO_BENTO_DESTINATION_SEED.name,
      SAO_BENTO_DESTINATION_SEED.slug,
      SAO_BENTO_DESTINATION_SEED.city,
      SAO_BENTO_DESTINATION_SEED.state,
      destinationDescription,
      SAO_BENTO_DESTINATION_SEED.heroTitle,
      SAO_BENTO_DESTINATION_SEED.heroSubtitle,
      SAO_BENTO_DESTINATION_SEED.lat,
      SAO_BENTO_DESTINATION_SEED.lng,
      SAO_BENTO_DESTINATION_SEED.sortOrder,
    ]
  );

  return rows[0]?.id;
};

const seedBanners = async (destinationId: string) => {
  const bannerTitles = SAO_BENTO_BANNER_SEEDS.map((seed) => seed.title);
  await AppDataSource.query(
    `
      DELETE FROM destination_banners
      WHERE destination_id = $1
        AND title = ANY($2::text[]);
    `,
    [destinationId, bannerTitles]
  );

  for (const seed of SAO_BENTO_BANNER_SEEDS) {
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

  for (const seed of SAO_BENTO_HOSPITALITY_SEEDS) {
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
          $12::jsonb,
          $13,
          $14,
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
        SAO_BENTO_DESTINATION_SEED.city,
        SAO_BENTO_DESTINATION_SEED.state,
        seed.phone || null,
        seed.whatsapp || null,
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
  const listingTitles = SAO_BENTO_LISTING_SEEDS.map((seed) => seed.title);
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
  for (const seed of SAO_BENTO_LISTING_SEEDS) {
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
          website_url,
          cta_type,
          cta_url,
          featured,
          sort_order,
          active,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, TRUE, NOW());
      `,
      [
        destinationId,
        seed.category,
        seed.title,
        listingDescription(seed),
        seed.address || null,
        seed.phone || null,
        seed.whatsapp || null,
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
    throw new Error('Nao foi possivel criar ou localizar o destino Sao Bento do Sapucai.');
  }

  await seedBanners(destinationId);
  const placesCount = await seedHospitalityPlaces(destinationId);
  const listingsCount = await seedListings(destinationId);

  log.info('Sao Bento tourism seed saved', {
    source: SAO_BENTO_TOURISM_SOURCE,
    destinationId,
    placesCount,
    listingsCount,
    bannersCount: SAO_BENTO_BANNER_SEEDS.length,
  });

  await AppDataSource.destroy();
};

seed().catch(async (error) => {
  log.error('Failed to seed Sao Bento tourism map', { error });
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  process.exit(1);
});
