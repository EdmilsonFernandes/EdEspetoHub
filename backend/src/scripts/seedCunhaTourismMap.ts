/*
 * Já no Caminho CONFIDENTIAL
 * ------------------
 * Copyright (C) 2026 Já no Caminho - All Rights Reserved.
 *
 * This file, project or its parts can not be copied and/or distributed without
 * the express permission of Já no Caminho.
 *
 * @file: seedCunhaTourismMap.ts
 * @Date: 2026-06-02
 */

import 'reflect-metadata';
import 'dotenv/config';
import { AppDataSource } from '../config/database';
import { runMigrations } from '../utils/runMigrations';
import { logger } from '../utils/logger';
import { seedTourismDestinationMap, TourismHospitalitySeed, TourismListingSeed } from '../utils/destinationTourismSeeder';
import {
  CUNHA_DESTINATION_SEED,
  CUNHA_HOSPITALITY_SEEDS,
  CUNHA_LISTING_SEEDS,
  CUNHA_TOURISM_SOURCE,
} from '../utils/cunhaTourismSeedData';

const log = logger.child({ scope: 'seedCunhaTourismMap' });

const destinationDescription = `${CUNHA_DESTINATION_SEED.description} Dados factuais importados como curadoria inicial; parcerias oficiais devem ser confirmadas pelos responsaveis.`;

const placeDescription = (seed: TourismHospitalitySeed) => {
  const typeLabel =
    seed.type === 'CHALE'
      ? 'Chale'
      : seed.type === 'HOTEL'
        ? 'Hotel'
        : seed.type === 'POUSADA'
          ? 'Pousada'
          : 'Hospedagem';

  return `${typeLabel} em Cunha cadastrado como curadoria inicial do Ja no Caminho. Fotos, tarifas e regras devem ser confirmadas pelo responsavel.`;
};

const listingDescription = (seed: TourismListingSeed) => {
  if (seed.category === 'RESTAURANTE_VISITAR') {
    return 'Lugar para comer ou visitar em Cunha. Confirme horarios, disponibilidade, entrega e valores diretamente com o estabelecimento.';
  }
  if (seed.category === 'PASSEIO') {
    return 'Experiencia local para visitantes em Cunha. Confirme disponibilidade, valores e requisitos diretamente com o responsavel.';
  }
  if (seed.category === 'ATRATIVO') {
    return 'Ponto de interesse da curadoria turistica de Cunha. Confirme acesso, clima e condicoes antes de visitar.';
  }
  if (seed.category === 'NOITE') {
    return 'Opcao local para sair ou conhecer a noite em Cunha. Confirme horarios antes de visitar.';
  }
  if (seed.category === 'LOJA') {
    return 'Compra local, ceramica, artesanato ou produto regional em Cunha. Confirme horarios, disponibilidade e valores diretamente com o responsavel.';
  }
  return 'Registro de curadoria local. Confirme horarios, disponibilidade e valores diretamente com o responsavel.';
};

const seed = async () => {
  await AppDataSource.initialize();
  await runMigrations();

  const result = await seedTourismDestinationMap({
    destination: CUNHA_DESTINATION_SEED,
    hospitality: CUNHA_HOSPITALITY_SEEDS,
    listings: CUNHA_LISTING_SEEDS,
    destinationDescription,
    placeDescription,
    listingDescription,
  });

  log.info('Cunha tourism seed saved', {
    source: CUNHA_TOURISM_SOURCE,
    ...result,
  });

  await AppDataSource.destroy();
};

seed().catch(async (error) => {
  log.error('Failed to seed Cunha tourism map', { error });
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  process.exit(1);
});
