/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2026 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: seedMonteiroLobatoTourismMap.ts
 * @Date: 2026-06-02
 */

import 'reflect-metadata';
import 'dotenv/config';
import { AppDataSource } from '../config/database';
import { runMigrations } from '../utils/runMigrations';
import { logger } from '../utils/logger';
import { seedTourismDestinationMap, TourismHospitalitySeed, TourismListingSeed } from '../utils/destinationTourismSeeder';
import {
  MONTEIRO_LOBATO_DESTINATION_SEED,
  MONTEIRO_LOBATO_HOSPITALITY_SEEDS,
  MONTEIRO_LOBATO_LISTING_SEEDS,
  MONTEIRO_LOBATO_TOURISM_SOURCE,
} from '../utils/monteiroLobatoTourismSeedData';

const log = logger.child({ scope: 'seedMonteiroLobatoTourismMap' });

const destinationDescription = `${MONTEIRO_LOBATO_DESTINATION_SEED.description} Dados factuais importados como curadoria inicial; parcerias oficiais devem ser confirmadas pelos responsaveis.`;

const placeDescription = (seed: TourismHospitalitySeed) => {
  const typeLabel =
    seed.type === 'CHALE'
      ? 'Chale'
      : seed.type === 'HOTEL'
        ? 'Hotel'
        : seed.type === 'POUSADA'
          ? 'Pousada'
          : 'Hospedagem';

  return `${typeLabel} em Monteiro Lobato cadastrado como curadoria inicial do Ja no Caminho. Fotos, tarifas e regras devem ser confirmadas pelo responsavel.`;
};

const listingDescription = (seed: TourismListingSeed) => {
  if (seed.category === 'RESTAURANTE_VISITAR') {
    return 'Lugar para comer ou visitar em Monteiro Lobato. Confirme horarios, disponibilidade, entrega e valores diretamente com o estabelecimento.';
  }
  if (seed.category === 'PASSEIO') {
    return 'Experiencia local para visitantes em Monteiro Lobato. Confirme disponibilidade, valores e requisitos diretamente com o responsavel.';
  }
  if (seed.category === 'ATRATIVO') {
    return 'Ponto de interesse da curadoria turistica de Monteiro Lobato.';
  }
  if (seed.category === 'NOITE') {
    return 'Opcao local para sair ou conhecer a noite em Monteiro Lobato. Confirme horarios antes de visitar.';
  }
  if (seed.category === 'LOJA') {
    return 'Compra local, artesanato ou produto regional em Monteiro Lobato. Confirme horarios, disponibilidade e valores diretamente com o responsavel.';
  }
  return 'Registro de curadoria local. Confirme horarios, disponibilidade e valores diretamente com o responsavel.';
};

const seed = async () => {
  await AppDataSource.initialize();
  await runMigrations();

  const result = await seedTourismDestinationMap({
    destination: MONTEIRO_LOBATO_DESTINATION_SEED,
    hospitality: MONTEIRO_LOBATO_HOSPITALITY_SEEDS,
    listings: MONTEIRO_LOBATO_LISTING_SEEDS,
    destinationDescription,
    placeDescription,
    listingDescription,
  });

  log.info('Monteiro Lobato tourism seed saved', {
    source: MONTEIRO_LOBATO_TOURISM_SOURCE,
    ...result,
  });

  await AppDataSource.destroy();
};

seed().catch(async (error) => {
  log.error('Failed to seed Monteiro Lobato tourism map', { error });
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  process.exit(1);
});
