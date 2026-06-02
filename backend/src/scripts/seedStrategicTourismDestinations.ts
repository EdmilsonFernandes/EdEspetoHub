/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2026 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: seedStrategicTourismDestinations.ts
 * @Date: 2026-06-02
 */

import 'reflect-metadata';
import 'dotenv/config';
import { AppDataSource } from '../config/database';
import { runMigrations } from '../utils/runMigrations';
import { logger } from '../utils/logger';
import { seedTourismDestinationMap, TourismHospitalitySeed, TourismListingSeed } from '../utils/destinationTourismSeeder';
import {
  STRATEGIC_TOURISM_BATCH_SOURCE,
  STRATEGIC_TOURISM_DESTINATION_SEEDS,
  StrategicTourismDestinationSeed,
} from '../utils/strategicTourismSeedData';

const log = logger.child({ scope: 'seedStrategicTourismDestinations' });

const destinationDescription = (seed: StrategicTourismDestinationSeed) =>
  `${seed.destination.description} Dados factuais importados como curadoria inicial; parcerias oficiais devem ser confirmadas pelos responsaveis.`;

const placeDescription = (city: string, seed: TourismHospitalitySeed) => {
  const typeLabel =
    seed.type === 'CHALE'
      ? 'Chale'
      : seed.type === 'HOTEL'
        ? 'Hotel'
        : seed.type === 'POUSADA'
          ? 'Pousada'
          : seed.type === 'CASA_TEMPORADA'
            ? 'Hospedagem'
            : 'Hospedagem';

  return `${typeLabel} em ${city} cadastrado como curadoria inicial do Ja no Caminho. Fotos, tarifas, regras e localizacao exata devem ser confirmadas pelo responsavel.`;
};

const listingDescription = (city: string, seed: TourismListingSeed) => {
  if (seed.category === 'RESTAURANTE_VISITAR') {
    return `Lugar para comer ou visitar em ${city}. Confirme horarios, disponibilidade, entrega e valores diretamente com o estabelecimento.`;
  }
  if (seed.category === 'PASSEIO') {
    return `Experiencia local para visitantes em ${city}. Confirme disponibilidade, valores, clima e requisitos diretamente com o responsavel.`;
  }
  if (seed.category === 'ATRATIVO') {
    return `Ponto de interesse da curadoria turistica de ${city}. Confirme acesso, clima e condicoes antes de visitar.`;
  }
  if (seed.category === 'NOITE') {
    return `Opcao local para sair ou conhecer a noite em ${city}. Confirme horarios antes de visitar.`;
  }
  if (seed.category === 'LOJA') {
    return `Compra local, artesanato ou produto regional em ${city}. Confirme horarios, disponibilidade e valores diretamente com o responsavel.`;
  }
  return `Registro de curadoria local em ${city}. Confirme horarios, disponibilidade e valores diretamente com o responsavel.`;
};

const seed = async () => {
  await AppDataSource.initialize();
  await runMigrations();

  const results = [];

  for (const seedData of STRATEGIC_TOURISM_DESTINATION_SEEDS) {
    const result = await seedTourismDestinationMap({
      destination: seedData.destination,
      hospitality: seedData.hospitality,
      listings: seedData.listings,
      destinationDescription: destinationDescription(seedData),
      placeDescription: (place) => placeDescription(seedData.destination.name, place),
      listingDescription: (listing) => listingDescription(seedData.destination.name, listing),
    });

    results.push({
      slug: seedData.destination.slug,
      source: seedData.source,
      ...result,
    });
  }

  log.info('Strategic tourism destinations seed saved', {
    source: STRATEGIC_TOURISM_BATCH_SOURCE,
    destinationsCount: results.length,
    placesCount: results.reduce((sum, item) => sum + item.placesCount, 0),
    listingsCount: results.reduce((sum, item) => sum + item.listingsCount, 0),
    results,
  });

  await AppDataSource.destroy();
};

seed().catch(async (error) => {
  log.error('Failed to seed strategic tourism destinations', { error });
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  process.exit(1);
});
